# Traders ERP — Deployment Commands

This file documents the current Compose setup. Production requires unique secrets, HTTPS at the host edge, monitoring, and a successful restore rehearsal before go-live.

## Local development (Docker Desktop or Linux)

```bash
git clone https://github.com/Syedirtiza768/traders.git
cd traders/compose
cp .env.example .env
docker compose up -d --build
docker compose logs -f site-init
docker compose ps
```

The sample `.env.example` values are public development credentials. Never copy them into production. On first start, `site-init` creates the configured Frappe site and installs ERPNext and `trader_app`. Wait for it to exit successfully. The database, backend, and frontend have health checks; inspect logs for services without a Compose health check. Open `http://localhost:8080`.

Install demo records only into a disposable development site:

```bash
docker compose exec backend bench --site trader.localhost execute trader_app.demo.install_demo
```

Do not enable demo-data installation in production.

## Production (Ubuntu/Linux)

1. Configure a domain and TLS certificates. The host Nginx template is `infra/nginx/ssl-reverse-proxy.conf`. Replace the domain and certificate paths before enabling it.
2. Set production secrets in `compose/.env`:

   ```bash
   cd /opt/traders/compose
   cp .env.production.example .env
   chmod 600 .env
   $EDITOR .env
   ```

   Set `SITE_NAME`, `DB_ROOT_PASSWORD`, and `ADMIN_PASSWORD` to unique random values held by your secret manager. Leave optional platform super-admin values blank unless explicitly needed.
3. Validate and start the production configuration:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   docker compose logs -f site-init
   docker compose ps
   ```

   Blank required database/admin secrets cause configuration or initialization to fail. The Compose proxy binds to `127.0.0.1:8080`; it is not intended for direct public exposure. Configure host Nginx to provide HTTPS and proxy to that loopback address.
4. Check the real hostname over HTTPS: login page, API, session cookies, static assets, websocket connection, and all service logs. The local clean-install check does not verify external DNS, certificates, TLS redirects, or secure-cookie behavior.

## Health and troubleshooting

```bash
docker compose ps
docker compose logs --tail=100 site-init
docker compose logs --tail=100 backend
docker compose logs --tail=100 worker-default
docker compose logs --tail=100 scheduler
curl --fail http://localhost:8080/api/method/ping
```

The API ping should return `{"message":"pong"}`. This is only a liveness check, not proof that business workflows are correct.

## Backup

From the repository root, run `./scripts/backup.sh`; from `compose`, run `../scripts/backup.sh`. The script uses Frappe's backup command and collects the site database backup, public/private uploads, and site configuration. Treat the archive as sensitive because the site configuration contains secrets. Store encrypted copies off-host and monitor backup failures, age, and disk capacity.

Example schedule (adjust the Compose project name and destination for the host):

```cron
0 2 * * * cd /opt/traders/compose && COMPOSE_PROJECT_NAME=compose ../scripts/backup.sh
```

A fresh QA backup has been restored into a separate site and selected counts matched. This is limited evidence: login against that latest restore, encrypted credentials, actual uploaded-file contents, off-host recovery, full host recreation, RPO/RTO and migration rollback have not all been tested. Do not treat the QA drill as production recovery proof.

## Updates and rollback

Before an update, take and verify a backup and preserve the previous immutable images and code revision. Deploy using the production Compose command above. A Git rollback does not reverse Frappe database migrations, and the repository does not provide a verified automated rollback. Rehearse migration compatibility and rollback in a disposable environment before production upgrades.

## Network exposure

Only the loopback-bound proxy is host-published. MariaDB, Redis, backend, websocket, and frontend ports are internal to the Compose network. Keep host firewall rules restricted to HTTPS and the required administrative access.
