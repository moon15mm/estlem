#!/usr/bin/env bash
###############################################################################
# Estlem — Quick Update Script (after initial deploy)
#
# Pulls latest code, rebuilds, restarts PM2.
# Use this for routine deployments after 02-deploy.sh.
#
# Usage on VPS:
#   bash /opt/estlem/scripts/vps/03-update.sh
###############################################################################
set -euo pipefail

G='\033[0;32m'; B='\033[0;34m'; N='\033[0m'
log() { echo -e "${B}[$(date +%H:%M:%S)]${N} $1"; }
ok()  { echo -e "  ${G}✓${N} $1"; }

cd /opt/estlem

log "Pulling latest"
git fetch origin
git reset --hard origin/main
ok "$(git log -1 --pretty=format:'%h %s')"

log "Installing deps (if changed)"
pnpm install --no-frozen-lockfile 2>&1 | tail -2
ok "deps ready"

log "Rebuilding"
pnpm --filter @estlem/shared build 2>&1 | tail -1 || true
pnpm --filter @estlem/api build 2>&1 | tail -1 || true
pnpm --filter @estlem/web build 2>&1 | tail -1 || true
pnpm --filter @estlem/dashboard build 2>&1 | tail -1 || true
ok "build complete"

log "Restarting PM2"
pm2 restart all --update-env
pm2 save >/dev/null 2>&1
ok "all apps restarted"

echo
pm2 status
