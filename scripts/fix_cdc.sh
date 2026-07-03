#!/bin/bash
cd /opt/traders/compose

SITE="enxi.realtrackapp.com"

echo ">> Creating Warehouse Type: Transit"
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site $SITE execute 'import frappe; frappe.get_doc({\"doctype\": \"Warehouse Type\", \"name\": \"Transit\"}).insert(ignore_permissions=True); frappe.db.commit(); print(\"Transit created\")'"

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
