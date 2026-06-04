#!/usr/bin/env bash
###############################################################################
# Estlem — VPS Deployment Script
#
# Run AFTER 01-provision.sh.
# Clones repo, installs deps, builds all apps, sets up Nginx + SSL,
# starts everything with PM2.
#
# Usage:
#   bash 02-deploy.sh <github-repo-url> <domain>
#
# Example:
#   bash 02-deploy.sh https://github.com/moon15mm/estlem.git estlem.store
#
# Domain layout (DNS A records must point to this VPS IP):
#   - estlem.store           → web
#   - dashboard.estlem.store → dashboard
#   - api.estlem.store       → API + WebSocket
#
# Safe to re-run for updates (pulls latest, rebuilds, restarts).
###############################################################################
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
log()  { echo -e "${B}[$(date +%H:%M:%S)]${N} $1"; }
ok()   { echo -e "  ${G}✓${N} $1"; }
warn() { echo -e "  ${Y}⚠${N} $1"; }
err()  { echo -e "  ${R}✗${N} $1"; }

if [[ $EUID -ne 0 ]]; then
  err "Must run as root."; exit 1
fi

REPO_URL="${1:-}"
DOMAIN="${2:-}"

if [[ -z "$REPO_URL" || -z "$DOMAIN" ]]; then
  err "Usage: bash $0 <github-repo-url> <web-domain> [dashboard-domain] [api-domain]"
  echo
  echo "Defaults (when only web-domain is given):"
  echo "  dashboard.<web-domain> for the dashboard"
  echo "  api.<web-domain>       for the API"
  echo
  echo "Examples:"
  echo "  # Standard layout — defaults work:"
  echo "  bash $0 https://github.com/moon15mm/estlem.git estlem.store"
  echo
  echo "  # Custom subdomains (when DNS uses different names):"
  echo "  bash $0 https://github.com/moon15mm/estlem.git vps.estlem.store dash-vps.estlem.store api-vps.estlem.store"
  exit 1
fi

APP_DIR=/opt/estlem
WEB_DOMAIN="$DOMAIN"
DASH_DOMAIN="${3:-dashboard.$DOMAIN}"
API_DOMAIN="${4:-api.$DOMAIN}"

log "Domains:"
ok "  web:       $WEB_DOMAIN"
ok "  dashboard: $DASH_DOMAIN"
ok "  api:       $API_DOMAIN"

# ─── 1. Clone or update repo ─────────────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Updating existing repo"
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  ok "pulled latest from origin/main"
else
  log "Cloning repo"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  ok "cloned to $APP_DIR"
fi

cd "$APP_DIR"

# ─── 2. Read DB credentials from provision step ──────────────────────────────
CRED_FILE=/root/estlem-credentials.txt
if [[ ! -f "$CRED_FILE" ]]; then
  err "Credentials file not found. Did you run 01-provision.sh first?"
  exit 1
fi
DATABASE_URL=$(grep "^DATABASE_URL=" "$CRED_FILE" | cut -d'=' -f2-)

# ─── 3. Write env files ──────────────────────────────────────────────────────
log "Writing environment files"

# API .env
JWT_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
cat > "$APP_DIR/apps/api/.env" <<EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=https://${WEB_DOMAIN}
DASHBOARD_URL=https://${DASH_DOMAIN}
EOF
ok "apps/api/.env"

# Web .env.local
cat > "$APP_DIR/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
NEXT_PUBLIC_WS_URL=https://${API_DOMAIN}
EOF
ok "apps/web/.env.local"

# Dashboard .env.local
cat > "$APP_DIR/apps/dashboard/.env.local" <<EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
NEXT_PUBLIC_WS_URL=https://${API_DOMAIN}
EOF
ok "apps/dashboard/.env.local"

# ─── 4. Install + build ──────────────────────────────────────────────────────
log "Installing dependencies (this can take a few minutes)"
pnpm install --no-frozen-lockfile 2>&1 | tail -3
ok "deps installed"

log "Building all apps"
pnpm --filter @estlem/shared build 2>&1 | tail -1 || true
pnpm --filter @estlem/api build 2>&1 | tail -1 || true
pnpm --filter @estlem/web build 2>&1 | tail -1 || true
pnpm --filter @estlem/dashboard build 2>&1 | tail -1 || true
ok "build complete"

# ─── 5. PM2 ecosystem ────────────────────────────────────────────────────────
log "Configuring PM2"
cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: 'estlem-api',
      cwd: '${APP_DIR}/apps/api',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: 3001 },
      max_memory_restart: '600M',
      autorestart: true,
    },
    {
      name: 'estlem-web',
      cwd: '${APP_DIR}/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production', PORT: 3000 },
      max_memory_restart: '600M',
      autorestart: true,
    },
    {
      name: 'estlem-dashboard',
      cwd: '${APP_DIR}/apps/dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      env: { NODE_ENV: 'production', PORT: 3002 },
      max_memory_restart: '600M',
      autorestart: true,
    },
  ],
};
EOF

pm2 start "$APP_DIR/ecosystem.config.js" 2>&1 | tail -5
pm2 save >/dev/null 2>&1
ok "PM2: 3 apps running"

# ─── 6. Nginx config ─────────────────────────────────────────────────────────
log "Writing Nginx config"
cat > /etc/nginx/sites-available/estlem <<EOF
# Web — main customer site
server {
  listen 80;
  server_name ${WEB_DOMAIN};
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_read_timeout 90;
  }
}

# Dashboard — store owners
server {
  listen 80;
  server_name ${DASH_DOMAIN};
  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

# API + WebSocket
server {
  listen 80;
  server_name ${API_DOMAIN};
  client_max_body_size 10M;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 90;
    proxy_send_timeout 90;
  }
  # WebSocket namespace
  location /ws {
    proxy_pass http://127.0.0.1:3001/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_read_timeout 86400;
  }
}
EOF

ln -sf /etc/nginx/sites-available/estlem /etc/nginx/sites-enabled/estlem
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 && systemctl reload nginx
ok "nginx configured + reloaded"

# ─── 7. SSL via Let's Encrypt ────────────────────────────────────────────────
log "Requesting SSL certificates"
warn "Make sure DNS A records for $WEB_DOMAIN, $DASH_DOMAIN, $API_DOMAIN point to this server's IP."
sleep 2

# Build certbot domain list — include www only for root-level domains
CERT_DOMAINS="-d $WEB_DOMAIN -d $DASH_DOMAIN -d $API_DOMAIN"
# Only add www if web domain is a root (no subdomain in front)
if [[ "$WEB_DOMAIN" =~ ^[^.]+\.[^.]+$ ]]; then
  CERT_DOMAINS="$CERT_DOMAINS -d www.$WEB_DOMAIN"
fi

certbot --nginx --non-interactive --agree-tos --email "admin@${DOMAIN##*.}" \
  $CERT_DOMAINS --redirect 2>&1 | tail -5 || warn "Certbot failed — re-run after DNS propagates"

ok "SSL configured (if DNS was ready)"

# ─── 8. Show status ──────────────────────────────────────────────────────────
echo
echo -e "${G}╔════════════════════════════════════════════════════╗${N}"
echo -e "${G}║  ✅  DEPLOYMENT COMPLETE                             ║${N}"
echo -e "${G}╚════════════════════════════════════════════════════╝${N}"
echo
pm2 status
echo
echo "URLs:"
echo "  • Web:        https://${WEB_DOMAIN}"
echo "  • Dashboard:  https://${DASH_DOMAIN}"
echo "  • API health: https://${API_DOMAIN}/api/v1/health"
echo
echo "Useful commands:"
echo "  pm2 logs                  # tail all app logs"
echo "  pm2 restart all           # restart all apps"
echo "  pm2 monit                 # live monitor"
echo "  bash $0 $REPO_URL $DOMAIN # re-run to pull + redeploy"
echo
