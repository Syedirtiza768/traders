#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# redeploy-ubuntu.sh  —  Full no-cache cold rebuild & redeploy on Ubuntu server
#
# Usage:
#   chmod +x scripts/redeploy-ubuntu.sh
#   ./scripts/redeploy-ubuntu.sh
#
# Assumes:
#   - Repo is cloned at ~/traders  (or adjust REPO_DIR below)
#   - docker + docker compose (v2) are installed
#   - User is in the docker group (or run with sudo)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_FILE="$REPO_DIR/compose/docker-compose.yml"
SITE_NAME="${SITE_NAME:-trader.localhost}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Traders — Full No-Cache Cold Rebuild & Redeploy"
echo "  Repo : $REPO_DIR"
echo "  Site : $SITE_NAME"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Pull latest code ──────────────────────────────────────────
echo "▶ [1/7] Pulling latest code from origin/main …"
cd "$REPO_DIR"
git fetch --all
git reset --hard origin/main
echo "   ✓ Code up to date: $(git log --oneline -1)"

# ── 2. Stop & remove all running containers ──────────────────────
echo ""
echo "▶ [2/7] Stopping and removing all containers …"
docker compose -f "$COMPOSE_FILE" down --remove-orphans --timeout 30 || true
echo "   ✓ Containers stopped"

# ── 3. Remove old application images ─────────────────────────────
echo ""
echo "▶ [3/7] Removing stale application images …"
docker image rm -f traders-backend:latest traders-frontend:latest 2>/dev/null || true
# Also remove any dangling images
docker image prune -f || true
echo "   ✓ Old images removed"

# ── 4. Purge entire Docker build cache ───────────────────────────
echo ""
echo "▶ [4/7] Purging Docker build cache …"
docker builder prune -af
echo "   ✓ Build cache cleared"

# ── 5. Build images from scratch (no cache, fresh base images) ───
echo ""
echo "▶ [5/7] Building backend + frontend images (--no-cache --pull) …"
echo "   This will take 5–15 minutes on first run …"
docker compose -f "$COMPOSE_FILE" build --no-cache --pull
echo "   ✓ Images built successfully"

# ── 6. Start all services ─────────────────────────────────────────
echo ""
echo "▶ [6/7] Starting all services …"
docker compose -f "$COMPOSE_FILE" up -d
echo "   ✓ Services started"

# ── 7. Wait for backend health, then clear Frappe cache ──────────
echo ""
echo "▶ [7/7] Waiting for backend to become healthy …"
RETRIES=30
until docker compose -f "$COMPOSE_FILE" exec -T backend \
      bash -c "cd /home/frappe/frappe-bench && bench --site $SITE_NAME doctor" \
      >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  echo "   … waiting (${RETRIES} retries left)"
  sleep 10
  RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -gt 0 ]; then
  echo "   Clearing Frappe cache on $SITE_NAME …"
  docker compose -f "$COMPOSE_FILE" exec -T backend \
    bash -c "cd /home/frappe/frappe-bench && bench --site $SITE_NAME clear-cache"
  echo "   ✓ Cache cleared"

  # Reset all demo user passwords so login works on a fresh volume
  echo "   Resetting user passwords …"
  docker compose -f "$COMPOSE_FILE" exec -T backend bash -c "
    cd /home/frappe/frappe-bench/sites && \
    /home/frappe/frappe-bench/env/bin/python - <<'PYEOF'
import frappe
from frappe.utils.password import update_password
frappe.init(site='$SITE_NAME')
frappe.connect()
users = [
    ('Administrator',              'admin'),
    ('admin@globaltrading.pk',     'Admin@12345'),
    ('demo@globaltrading.pk',      'Demo@12345'),
    ('sales@globaltrading.pk',     'Demo@12345'),
    ('purchase@globaltrading.pk',  'Demo@12345'),
    ('accounts@globaltrading.pk',  'Demo@12345'),
    ('warehouse@globaltrading.pk', 'Demo@12345'),
]
for user, pwd in users:
    try:
        update_password(user, pwd)
        frappe.db.commit()
        print('OK: ' + user)
    except Exception as e:
        print('SKIP: ' + user + ' — ' + str(e))
frappe.destroy()
PYEOF
  "
  echo "   ✓ Passwords reset"
else
  echo "   ⚠  Backend health check timed out — clear cache manually:"
  echo "      docker compose -f $COMPOSE_FILE exec backend bash -c \\"
  echo "        \"cd /home/frappe/frappe-bench && bench --site $SITE_NAME clear-cache\""
fi

# ── Final status ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Container status:"
echo "═══════════════════════════════════════════════════════════"
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "  ✅  Redeploy complete."
echo ""
