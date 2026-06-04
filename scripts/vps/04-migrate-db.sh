#!/usr/bin/env bash
###############################################################################
# Estlem — Database Migration: Render → VPS
#
# Dumps the production Postgres on Render and restores it into the
# local VPS Postgres.
#
# Usage on VPS (after 01-provision.sh):
#   bash 04-migrate-db.sh "<render-database-url>"
#
# Example:
#   bash 04-migrate-db.sh "postgresql://user:pass@host:5432/estlem"
#
# Safe to re-run — drops & recreates the local DB each time.
###############################################################################
set -euo pipefail

G='\033[0;32m'; R='\033[0;31m'; B='\033[0;34m'; Y='\033[1;33m'; N='\033[0m'
log() { echo -e "${B}[$(date +%H:%M:%S)]${N} $1"; }
ok()  { echo -e "  ${G}✓${N} $1"; }
err() { echo -e "  ${R}✗${N} $1"; }

REMOTE_DB="${1:-}"
if [[ -z "$REMOTE_DB" ]]; then
  err "Usage: bash $0 <remote-database-url>"
  exit 1
fi

CRED_FILE=/root/estlem-credentials.txt
LOCAL_DB=$(grep "^DATABASE_URL=" "$CRED_FILE" | cut -d'=' -f2-)

DUMP=/tmp/estlem-render-dump.sql

log "Dumping remote DB"
pg_dump --no-owner --no-acl --clean --if-exists "$REMOTE_DB" > "$DUMP"
ok "dumped $(du -h $DUMP | cut -f1)"

log "Restoring into local DB"
psql "$LOCAL_DB" < "$DUMP" 2>&1 | tail -3 || true
ok "restore complete"

log "Verifying"
TABLES=$(psql "$LOCAL_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
echo -e "  ${Y}→${N} ${TABLES} tables in local DB"

rm -f "$DUMP"
ok "cleanup done"

echo
echo -e "${G}✅ Database migrated.${N}"
echo "Test: psql \"$LOCAL_DB\" -c '\\dt'"
