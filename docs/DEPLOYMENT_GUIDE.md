# Deployment Guide

This guide describes the current Compose setup. A production-style deployment and a local TLS proxy path were exercised in an isolated QA project. Production still requires operator-owned TLS certificates and DNS, secret storage, off-host backup monitoring, and a rollback procedure proven against the target environment.

## Prerequisites

- Linux host with Docker Engine and the Docker Compose plugin
- 8 GB RAM recommended; 20 GB free disk as a starting point
- DNS name pointed at the production host
- A secret manager or password manager for production credentials

## Local development

```bash
git clone https://github.com/Syedirtiza768/traders.git
cd traders/compose
cp .env.example .env
docker compose up -d --build
docker compose logs -f site-init
```

The local environment file contains public development-only sample passwords. Do not use it in production. The `site-init` service creates the Frappe site and installs ERPNext and `trader_app` on first start. It runs once per persistent sites volume and installs a missing app on later starts. Visit `http://localhost:8080`.

Demo data is opt-in and must only be installed in a fresh, empty, isolated development site. It refuses populated sites; do not use it against production or an existing ERP site:

```bash
docker compose exec backend bench --site trader.localhost set-config allow_demo_seed true
docker compose exec backend bench --site trader.localhost execute trader_app.demo.install_demo
```

The current QA clean-site run created 2,453 records with zero generator errors and passed every validation. The installer and uninstaller safety regression tests pass. Do not directly invoke seed or uninstall operations on populated sites.

## Production deployment

1. Clone a reviewed repository revision on the production host.
2. Create the environment file and enter unique secrets:

   ```bash
   cd traders/compose
   cp .env.production.example .env
   chmod 600 .env
   $EDITOR .env
   ```

   Set `SITE_NAME`, `DB_ROOT_PASSWORD`, and `ADMIN_PASSWORD`. Use long, unique randomly generated values from a secret manager. Keep the optional platform super-admin credentials blank unless that seed operation is explicitly required. Never commit `.env`.

3. Validate the merged production configuration. It must fail if required secrets are blank:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
   ```

4. Build and start the stack:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   docker compose logs -f site-init
   docker compose ps
   ```

   First installation takes several minutes. Wait for `site-init` to exit successfully and for database, backend, frontend, Redis, websocket, and proxy health checks to pass. Worker and scheduler services still rely on log and queue monitoring; review their logs and verify queue processing during deployment.

5. The Compose proxy listens on loopback at `127.0.0.1:8080`. Do not publish that port directly to the internet. Install the host Nginx TLS configuration from `infra/nginx/ssl-reverse-proxy.conf`, replace every example domain and certificate path with the real values, validate with `sudo nginx -t`, then reload Nginx. In the isolated QA path, Nginx syntax, HTTP-to-HTTPS redirect, HTTPS API ping, authenticated login, and `Secure`, `HttpOnly`, `SameSite=Lax` session-cookie flags all passed using a temporary self-signed certificate. Real DNS, certificate renewal, and public ingress were not tested.

Production demo data is disabled by default. Do not set `INSTALL_DEMO=true` in production.

## Routine operations

Run commands from `traders/compose` so Compose selects the same project. Check service state with `docker compose ps` and investigate service-specific logs with `docker compose logs --tail=100 <service>`. Avoid commands such as `docker system prune -a` on a host that contains data or images needed by other projects.

## Backup

Configure `BACKUP_DIR` and `BACKUP_RETENTION_DAYS` in the deployment environment. Run `../scripts/backup.sh` from `traders/compose` or run it from the repository root. The script uses Frappe's site backup command, copies the site backup files, public and private uploads, and `site_config.json`, creates a restricted archive, and removes expired archives. The site configuration contains sensitive values, so keep the destination encrypted and access-controlled and copy archives off-host.

Example daily schedule (adjust the account, working directory, project name, and destination to the host):

```cron
0 2 * * * cd /opt/traders/compose && COMPOSE_PROJECT_NAME=compose ../scripts/backup.sh
```

Configure external monitoring to alert on backup command failures, archive age, available disk space, and failed off-host copies. Two scoped QA restore drills have completed. An earlier snapshot restore passed login and selected count checks. On 2026-10-05, a fresh backup of the current QA site was restored into a new separate site; Frappe, ERPNext and `trader_app` were present, and 13 selected document counts matched exactly. That source had no configured encryption key, Email Account records, or physical public/private uploaded files, so encrypted-value and nonempty attachment recovery remain unverified. Production off-host transfer, encryption at rest, retention behavior, restored-site login for the latest snapshot, full host recreation, and RPO/RTO were not tested or measured.

## Restore

Restore into a separate test site first. Do not overwrite the production site as an unverified test. The archive contains Frappe's database and file backups and `site_config.json`. A QA drill used this sequence inside the backend container (replace the example site and archive paths with values from the protected archive):

```bash
bench new-site restore-check.example \
  --db-host "$DB_HOST" --db-port "$DB_PORT" \
  --mariadb-root-password "$DB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --mariadb-user-host-login-scope='%'

bench --site restore-check.example restore /protected/path/database.sql.gz \
  --db-root-password "$DB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --with-public-files /protected/path/files.tar \
  --with-private-files /protected/path/private-files.tar
```

The earlier drill restored the database and public/private file archives into a separate empty site; login succeeded after restarting the backend. The current-snapshot drill also restored successfully and matched selected counts, but did not confirm login or nonempty attachments. Restart the backend after adding/restoring a site into an already-running bench so startup creates that site's log links:

```bash
docker compose restart backend
```

Earlier submitted record counts matched between source and restored site: Sales Invoice 385, Purchase Invoice 140, Payment Entry 184, Journal Entry 72, GL Entry 2,130, and Stock Ledger Entry 554. In the 2026-10-05 drill, all 13 selected current-snapshot counts matched, including Sales Invoice 354, Purchase Invoice 192, Payment Entry 424, Journal Entry 72, GL Entry 2,699, and Stock Ledger Entry 654. If a source site has an encryption key, securely merge only that key into the restored site's configuration without replacing its database credentials. Nonempty attachment contents, encrypted values, off-host restore, and full infrastructure rebuild were not demonstrated; validate those before production use.

## Rollback

Do not assume a Git checkout rollback reverses database migrations. Keep a database-and-files backup and the previous application image before upgrading. Current deployment scripts do not provide an automated rollback, and rollback was not tested in this audit. If a migration has run, do not simply check out old code against the migrated database; restore the pre-deploy backup and previous image in an isolated recovery environment, validate it, then switch traffic using the operator's reviewed recovery procedure. Treat that procedure as unverified until it has been rehearsed on the target infrastructure.
