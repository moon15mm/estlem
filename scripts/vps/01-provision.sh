#!/usr/bin/env bash
###############################################################################
# Estlem — VPS Provisioning Script
#
# Run this ONCE on a fresh Ubuntu 22.04 / 24.04 VPS as root.
# It installs everything needed to host the full Estlem stack:
#   - Node.js 20.x
#   - pnpm 9.15.4
#   - PostgreSQL 16
#   - Nginx + Certbot (Let's Encrypt SSL)
#   - PM2 for process management
#   - UFW firewall (ports 22, 80, 443)
#   - Dedicated 'estlem' user
#
# Usage on the VPS:
#   curl -fsSL https://raw.githubusercontent.com/moon15mm/estlem/main/scripts/vps/01-provision.sh | bash
#   OR
#   bash 01-provision.sh
#
# Safe to re-run — every step checks first.
###############################################################################
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
log()  { echo -e "${B}[$(date +%H:%M:%S)]${N} $1"; }
ok()   { echo -e "  ${G}✓${N} $1"; }
warn() { echo -e "  ${Y}⚠${N} $1"; }
err()  { echo -e "  ${R}✗${N} $1"; }

# ─── Pre-flight ───────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "Must run as root. Try: sudo bash $0"
  exit 1
fi

if ! grep -q "Ubuntu" /etc/os-release; then
  warn "Not Ubuntu — script tested on 22.04/24.04. Continuing anyway..."
fi

# ─── 1. System update ────────────────────────────────────────────────────────
log "Updating apt cache"
DEBIAN_FRONTEND=noninteractive apt-get update -qq
ok "apt updated"

log "Installing essentials"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl wget git ufw build-essential ca-certificates gnupg lsb-release \
  unzip zip jq sudo openssl >/dev/null
ok "essentials installed"

# ─── 2. Node 20 ──────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null || [[ ! "$(node -v 2>/dev/null)" =~ ^v20 ]]; then
  log "Installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
fi
ok "node $(node -v)"

# ─── 3. pnpm 9.15.4 ──────────────────────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  log "Installing pnpm"
  npm install -g pnpm@9.15.4 --silent >/dev/null 2>&1
fi
ok "pnpm $(pnpm -v)"

# ─── 4. PM2 ──────────────────────────────────────────────────────────────────
if ! command -v pm2 &> /dev/null; then
  log "Installing PM2"
  npm install -g pm2 --silent >/dev/null 2>&1
  pm2 startup systemd -u root --hp /root | tail -1 | bash >/dev/null 2>&1 || true
fi
ok "pm2 $(pm2 -v)"

# ─── 5. PostgreSQL 16 ────────────────────────────────────────────────────────
if ! command -v psql &> /dev/null; then
  log "Installing PostgreSQL 16"
  sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-16 postgresql-contrib-16 >/dev/null
  systemctl enable --now postgresql >/dev/null 2>&1
fi
ok "postgresql $(psql --version | awk '{print $3}')"

# ─── 6. Nginx + Certbot ──────────────────────────────────────────────────────
if ! command -v nginx &> /dev/null; then
  log "Installing Nginx"
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx >/dev/null
  systemctl enable --now nginx >/dev/null 2>&1
fi
ok "nginx $(nginx -v 2>&1 | awk -F'/' '{print $2}')"

if ! command -v certbot &> /dev/null; then
  log "Installing Certbot"
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
fi
ok "certbot $(certbot --version 2>&1 | awk '{print $2}')"

# ─── 7. UFW firewall ─────────────────────────────────────────────────────────
log "Configuring firewall"
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow 22/tcp comment "SSH" >/dev/null 2>&1
ufw allow 80/tcp comment "HTTP" >/dev/null 2>&1
ufw allow 443/tcp comment "HTTPS" >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1
ok "ufw: 22, 80, 443 open"

# ─── 8. Dedicated user + directory ───────────────────────────────────────────
if ! id estlem &> /dev/null; then
  log "Creating user 'estlem'"
  useradd -m -s /bin/bash estlem
  usermod -aG sudo estlem
fi
mkdir -p /opt/estlem
chown -R estlem:estlem /opt/estlem
ok "user 'estlem' ready, /opt/estlem owned"

# ─── 9. PostgreSQL database + user ───────────────────────────────────────────
log "Setting up PostgreSQL database"
DB_PASS=$(openssl rand -hex 24)
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='estlem'" | grep -q 1 || \
  sudo -u postgres createdb estlem
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='estlem'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE estlem WITH LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE estlem TO estlem;" >/dev/null
sudo -u postgres psql -c "ALTER DATABASE estlem OWNER TO estlem;" >/dev/null
ok "db 'estlem' ready (user: estlem)"

# ─── 10. Save credentials ────────────────────────────────────────────────────
CRED_FILE=/root/estlem-credentials.txt
cat > $CRED_FILE <<EOF
═══════════════════════════════════════════════════════════
  ESTLEM VPS — CREDENTIALS (KEEP SAFE)
  Generated: $(date)
═══════════════════════════════════════════════════════════

DATABASE_URL=postgresql://estlem:${DB_PASS}@127.0.0.1:5432/estlem

Postgres user:  estlem
Postgres pass:  ${DB_PASS}
Database name:  estlem

Linux user:     estlem
App directory:  /opt/estlem

═══════════════════════════════════════════════════════════
EOF
chmod 600 $CRED_FILE
ok "credentials saved to $CRED_FILE"

# ─── Done ────────────────────────────────────────────────────────────────────
echo
echo -e "${G}╔════════════════════════════════════════════════════╗${N}"
echo -e "${G}║  ✅  VPS PROVISIONED SUCCESSFULLY                    ║${N}"
echo -e "${G}╚════════════════════════════════════════════════════╝${N}"
echo
echo "Installed:"
echo "  • Node $(node -v) + pnpm $(pnpm -v)"
echo "  • PostgreSQL 16 (db: estlem)"
echo "  • Nginx + Certbot"
echo "  • PM2 for process management"
echo "  • UFW firewall"
echo
echo "Credentials saved to: ${CRED_FILE}"
echo
echo -e "${Y}NEXT STEP:${N}"
echo "  Run the deploy script to clone repo, build, and start services:"
echo
echo "    bash /opt/estlem/scripts/vps/02-deploy.sh <github-repo-url> <domain>"
echo
echo "  Example:"
echo "    bash /opt/estlem/scripts/vps/02-deploy.sh https://github.com/moon15mm/estlem.git estlem.store"
echo
