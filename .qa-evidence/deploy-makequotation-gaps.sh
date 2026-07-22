#!/bin/bash
set -euo pipefail
SITE=enxi.realtrackapp.com
COMPOSE_DIR=/opt/traders/compose
REPO=/opt/traders

echo "==> Fix git ownership"
sudo chown -R ubuntu:ubuntu "$REPO/.git" || true

echo "==> Pull origin/main"
cd "$REPO"
git status --short || true
git fetch origin main
git checkout main
git reset --hard origin/main
echo "HEAD=$(git rev-parse --short HEAD)"
git log -1 --oneline

echo "==> Rebuild backend + frontend"
cd "$COMPOSE_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend frontend

echo "==> Recreate services"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  backend frontend scheduler websocket worker-default worker-short worker-long

echo "==> Wait for backend healthy"
for i in $(seq 1 90); do
  status=$(docker inspect --format='{{.State.Health.Status}}' compose-backend-1 2>/dev/null || echo starting)
  echo "  backend health: $status ($i)"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep 5
done

bench() {
  docker exec -u frappe -e PATH=/home/frappe/.local/bin:/usr/bin:/bin compose-backend-1 \
    bash -lc "cd /home/frappe/frappe-bench && $*"
}

echo "==> Migrate site"
bench "bench --site $SITE migrate"

echo "==> Ensure custom fields (Order Details delivery/contact/dates)"
bench "bench --site $SITE execute trader_app.setup.custom_fields.ensure_custom_fields"

echo "==> Clear cache"
bench "bench --site $SITE clear-cache" || true

echo "==> Company flags (CDC opportunity must stay 0)"
bench "bench --site $SITE mariadb -e \"SELECT name, IFNULL(trader_opportunity_enabled,0) AS opportunity FROM tabCompany ORDER BY name;\""

echo "==> Smoke commercial totals module"
bench "bench --site $SITE execute trader_app.api.commercial_totals.compute_commercial_totals --kwargs \"{'net': 1000, 'gst_mode': 'exclusive', 'services': 0}\""

cd "$COMPOSE_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps backend frontend
echo DEPLOY_MAKEQUOTATION_GAPS_OK
