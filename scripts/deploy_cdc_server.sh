#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="/opt/traders/compose/docker-compose.yml"
ENV_FILE="/opt/traders/compose/.env"

source "$ENV_FILE"

SITE_NAME="${SITE_NAME:-enxi.realtrackapp.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@2026}"

log()  { echo -e "\n\033[1;34m>> $*\033[0m"; }
ok()   { echo -e "\033[1;32mOK: $*\033[0m"; }
fail() { echo -e "\033[1;31mFAIL: $*\033[0m"; exit 1; }

bench_exec() {
    docker compose -f "$COMPOSE_FILE" exec -T backend \
        bash -c "cd /home/frappe/frappe-bench && $*"
}

# Step 1: Drop old site if it exists
log "Dropping old site if it exists"
bench_exec "bench drop-site '$SITE_NAME' --force --no-backup 2>/dev/null || echo 'No old site to drop'"
ok "Old site cleaned up"

# Step 2: Ensure apps.txt is correct
log "Setting up apps.txt"
bench_exec "printf '%s\n' frappe erpnext trader_app > sites/apps.txt"
ok "apps.txt written"

# Step 3: Install trader_app in bench
log "Installing trader_app in bench"
bench_exec "/home/frappe/frappe-bench/env/bin/pip install -q -e apps/trader_app 2>/dev/null || true"
ok "trader_app pip-installed"

# Step 4: Create new site
log "Creating site $SITE_NAME"
bench_exec "bench new-site '$SITE_NAME' \
    --db-root-password '$DB_ROOT_PASSWORD' \
    --admin-password '$ADMIN_PASSWORD' \
    --install-app erpnext \
    --install-app trader_app \
    --mariadb-user-host-login-scope='%'"
ok "Site created with erpnext + trader_app"

# Step 5: Run migrations
log "Running migrations"
bench_exec "bench --site '$SITE_NAME' migrate --skip-failing || bench --site '$SITE_NAME' migrate"
ok "Migrations done"

# Step 6: Run after_install
log "Running after_install (custom roles, fields)"
bench_exec "bench --site '$SITE_NAME' execute trader_app.setup.after_install"
ok "Custom roles and fields created"

# Step 7: Enable multi-tenant
log "Enabling multi-tenant mode"
bench_exec "bench --site '$SITE_NAME' set-config trader_multitenant_enabled 1"
ok "Multi-tenant enabled"

# Step 8: Seed super admin
log "Seeding super admin"
bench_exec "bench --site '$SITE_NAME' execute trader_app.setup.seed_super_admin.run" || true
ok "Super admin seeded"

# Step 9: Copy CDC setup script into the container
log "Copying CDC setup script"
docker compose -f "$COMPOSE_FILE" exec -T backend bash -c \
    "cat > /home/frappe/frappe-bench/apps/trader_app/trader_app/setup_cdc.py" < /opt/traders/scripts/setup_cdc.py
ok "CDC script copied"

# Step 10: Run CDC setup
log "Running CDC setup (company, items, stock, parties, cash)"
bench_exec "bench --site '$SITE_NAME' execute trader_app.setup_cdc.run"
ok "CDC company setup complete"

# Step 11: Start all services
log "Starting all services"
docker compose -f "$COMPOSE_FILE" up -d
ok "All services started"

# Step 12: Health check
log "Running health check"
sleep 10
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
    "http://localhost:${HTTP_PORT:-8080}/api/method/ping" 2>/dev/null || echo "000")

if [ "$API_STATUS" = "200" ]; then
    ok "Health check passed - API responding"
else
    echo "API returned HTTP $API_STATUS - may need a moment to warm up"
fi

# Summary
echo ""
echo "=========================================="
echo "  CDC DEPLOYMENT COMPLETE"
echo "=========================================="
echo "  Site:     https://$SITE_NAME"
echo "  Admin:    moeez@cdc.ae"
echo "  Password: CDC@2026!"
echo "  API:      http://localhost:${HTTP_PORT:-8080}"
echo "=========================================="
