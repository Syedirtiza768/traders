#!/usr/bin/env bash
set -euo pipefail

cd /home/frappe/frappe-bench

: "${SITE_NAME:?SITE_NAME is required}"
: "${DB_HOST:?DB_HOST is required}"
: "${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD is required}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}"
: "${REDIS_CACHE:?REDIS_CACHE is required}"
: "${REDIS_QUEUE:?REDIS_QUEUE is required}"

if [[ ! "$SITE_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]]; then
    echo "SITE_NAME must be a DNS-style name without path separators." >&2
    exit 2
fi

bench set-config -g db_host "$DB_HOST"
bench set-config -g redis_cache "redis://${REDIS_CACHE}"
bench set-config -g redis_queue "redis://${REDIS_QUEUE}"

site_dir="sites/${SITE_NAME}"
if [[ ! -f "${site_dir}/site_config.json" ]]; then
    bench new-site "$SITE_NAME" \
        --db-host "$DB_HOST" \
        --db-port "${DB_PORT:-3306}" \
        --mariadb-root-password "$DB_ROOT_PASSWORD" \
        --admin-password "$ADMIN_PASSWORD" \
        --mariadb-user-host-login-scope='%' \
        --install-app erpnext \
        --install-app trader_app
else
    for app in erpnext trader_app; do
        if ! bench --site "$SITE_NAME" list-apps | awk -v app="$app" '$1 == app { found = 1 } END { exit !found }'; then
            bench --site "$SITE_NAME" install-app "$app"
        fi
    done
fi

bench --site "$SITE_NAME" list-apps
