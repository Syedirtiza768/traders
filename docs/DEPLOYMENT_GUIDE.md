# Deployment Guide

## Prerequisites

- Ubuntu 22.04 LTS (or any Linux with Docker support)
- Docker Engine 24+
- Docker Compose v2+
- 4 GB RAM minimum (8 GB recommended)
- 20 GB disk space
- Domain name (optional, for production)

## Quick Deployment

### 1. Clone Repository

```bash
git clone https://github.com/Syedirtiza768/traders.git
cd traders
```

### 2. Configure Environment

```bash
cp compose/.env.example compose/.env
# Edit compose/.env with your settings
nano compose/.env
```

Key settings to configure:
- `SITE_NAME` — your domain or `trader.localhost`
- `DB_ROOT_PASSWORD` — MariaDB root password
- `ADMIN_PASSWORD` — ERPNext admin password
- `ENCRYPTION_KEY` — random encryption key

### 3. Start Services

```bash
docker compose -f compose/docker-compose.yml up -d
```

### 4. Wait for Initialization

First startup takes 3–5 minutes. Monitor:

```bash
docker compose -f compose/docker-compose.yml logs -f backend
```

Wait for: `Booting worker with pid: ...`

### 5. Create Site

```bash
docker compose -f compose/docker-compose.yml exec backend \
  bench new-site trader.localhost \
    --mariadb-root-password ${DB_ROOT_PASSWORD} \
    --admin-password ${ADMIN_PASSWORD} \
    --install-app erpnext \
    --install-app trader_app
```

### 6. Install Demo Data

```bash
docker compose -f compose/docker-compose.yml exec backend \
  bench --site trader.localhost execute trader_app.demo.install_demo
```

### 7. Access System

- **Trader UI**: http://localhost:8080
- **ERPNext Desk**: http://localhost:8080/app (admin access only)
- **API**: http://localhost:8080/api

## Production Deployment

### SSL/TLS with Let's Encrypt

1. Point your domain to server IP
2. Update `SITE_NAME` in `.env`
3. Use the production compose override:

```bash
docker compose -f compose/docker-compose.yml -f compose/docker-compose.prod.yml up -d
```

### Backup

```bash
# Manual backup
./scripts/backup.sh

# Automated daily backup (add to crontab)
0 2 * * * /path/to/traders/scripts/backup.sh
```

### Monitoring

```bash
# Check all services
docker compose -f compose/docker-compose.yml ps

# View logs
docker compose -f compose/docker-compose.yml logs -f --tail=100

# Check health
curl http://localhost:8080/api/method/ping
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not starting | Check MariaDB is ready: `docker compose logs db` |
| Redis connection error | Ensure redis containers are running |
| Permission denied | Run `chmod +x scripts/*.sh` |
| Site not found | Run bench new-site command |
| Demo data missing | Run install_demo command |
