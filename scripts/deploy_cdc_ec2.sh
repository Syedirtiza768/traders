#!/bin/bash
cd /opt/traders/compose
set -e

SITE="enxi.realtrackapp.com"
DB_ROOT_PASS=$(grep DB_ROOT_PASSWORD /opt/traders/compose/.env | cut -d= -f2-)
ADMIN_PASS=$(grep ADMIN_PASSWORD /opt/traders/compose/.env | cut -d= -f2-)

echo ">> Dropping old site"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench drop-site $SITE --force --no-backup --db-root-password '$DB_ROOT_PASS'" 2>&1 || echo "No old site to drop"

echo ">> Setting up apps.txt"
docker compose exec -T backend bash -c "printf 'frappe\nerpnext\ntrader_app\n' > /home/frappe/frappe-bench/sites/apps.txt"

echo ">> Creating new site"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench new-site $SITE --db-root-password '$DB_ROOT_PASS' --admin-password '$ADMIN_PASS' --install-app erpnext --install-app trader_app --mariadb-user-host-login-scope='%%'"

echo ">> Setting as default"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench use $SITE"

echo ">> Running after_install"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site $SITE execute trader_app.setup.after_install"

echo ">> Enabling multi-tenant"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site $SITE set-config trader_multitenant_enabled 1"

echo ">> Copying CDC setup script"
docker compose exec -T backend bash -c "cat > /home/frappe/frappe-bench/apps/trader_app/trader_app/setup_cdc.py" < /opt/traders/scripts/setup_cdc.py

echo ">> Running CDC setup"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site $SITE execute trader_app.setup_cdc.run"

echo ">> Starting all services"
docker compose up -d

sleep 15

echo ">> Health check"
curl -s -o /dev/null -w "API: HTTP %{http_code}\n" --max-time 30 http://localhost:8080/api/method/ping || echo "API not ready"

echo ""
echo "=========================================="
echo "  CDC DEPLOYMENT COMPLETE"
echo "=========================================="
echo "  Site:     https://$SITE"
echo "  Admin:    moeez@cdc.ae"
echo "  Password: CDC@2026!"
echo "=========================================="
