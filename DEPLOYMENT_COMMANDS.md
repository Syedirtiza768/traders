# 🚀 Trader Business System — Deployment Commands
**Repository:** https://github.com/Syedirtiza768/traders

---

## 📦 Local Development (Windows with Docker Desktop)

```powershell
# 1. Clone repository
git clone https://github.com/Syedirtiza768/traders.git
cd traders

# 2. Setup environment
cd compose
Copy-Item .env.example .env
# Edit .env if needed (default settings work for local testing)

# 3. Start all services
docker compose up -d

# 4. Watch initialization (first run: 5-10 minutes)
docker compose logs -f backend

# 5. Wait for "Frappe site initialized successfully" message
# Press Ctrl+C when ready

# 6. Install demo data (RECOMMENDED)
docker compose exec backend bench --site trader.localhost console
```

**In the Frappe console, run:**
```python
from trader_app.demo import install_demo
install_demo()
exit()
```

**Access Points:**
- 🌐 **Frontend UI:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:8000  
- 📊 **Main Proxy:** http://localhost:8080

**Demo Login:**
- Email: `demo.admin@traderapp.com`
- Password: `Demo@12345`

---

## 🌍 Production Server Deployment (Ubuntu/Debian Linux)

### Prerequisites

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin -y

# Install Git
sudo apt-get install git -y
```

### Automated Deployment

```bash
# 1. Clone to /opt directory
cd /opt
sudo git clone https://github.com/Syedirtiza768/traders.git
sudo chown -R $USER:$USER traders
cd traders

# 2. Run automated setup script
chmod +x scripts/setup.sh
INSTALL_DEMO=true ./scripts/setup.sh
```

The script automatically:
- ✅ Creates `.env` with secure random passwords
- ✅ Builds Docker images
- ✅ Starts all services
- ✅ Waits for health checks
- ✅ Installs demo data

### Manual Production Setup

```bash
# 1. Clone repository
cd /opt
git clone https://github.com/Syedirtiza768/traders.git
cd traders

# 2. Configure environment
cp compose/.env.example compose/.env
nano compose/.env

# Update these critical values:
# - SITE_NAME=trader.yourcompany.com
# - DB_ROOT_PASSWORD=<strong-password>
# - ADMIN_PASSWORD=<strong-password>
# - ENCRYPTION_KEY=<random-64-chars>
# - SECRET_KEY=<random-64-chars>

# 3. Build and start
cd compose
docker compose up -d

# 4. Monitor startup
docker compose logs -f backend

# 5. Install demo data (optional)
docker compose exec backend bench --site trader.yourcompany.com console
# Then: from trader_app.demo import install_demo; install_demo()
```

---

## 🔒 SSL/HTTPS Setup (Production)

### Install Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx -y
```

### Get SSL Certificate

```bash
# Replace with your domain
sudo certbot certonly --standalone -d trader.yourcompany.com

# Certificates will be in:
# /etc/letsencrypt/live/trader.yourcompany.com/
```

### Configure Nginx Reverse Proxy

```bash
# Copy SSL config
sudo cp /opt/traders/infra/nginx/ssl-reverse-proxy.conf /etc/nginx/sites-available/trader

# Edit domain name
sudo nano /etc/nginx/sites-available/trader
# Change: server_name trader.yourcompany.com;

# Enable site
sudo ln -s /etc/nginx/sites-available/trader /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🔄 Updates & Maintenance

### Deploy Updates

```bash
cd /opt/traders
./scripts/deploy.sh

# Or skip backup:
./scripts/deploy.sh --no-backup
```

### Manual Backup

```bash
cd /opt/traders
./scripts/backup.sh

# Backups saved to: /opt/traders/backups/
# Retention: 30 days (configurable in script)
```

### Schedule Automated Backups

```bash
sudo crontab -e

# Add this line (daily at 2 AM):
0 2 * * * /opt/traders/scripts/backup.sh
```

---

## 🔍 Monitoring & Troubleshooting

### Check Service Status

```bash
cd /opt/traders/compose
docker compose ps

# Should show all services as "Up (healthy)"
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Last 100 lines
docker compose logs --tail=100 backend
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### Access Database

```bash
docker compose exec db mysql -u root -p
# Enter DB_ROOT_PASSWORD from .env

# Inside MySQL:
SHOW DATABASES;
USE trader_db;
SHOW TABLES;
```

### Access Frappe Console

```bash
docker compose exec backend bench --site trader.localhost console

# Inside console:
frappe.db.get_list('Sales Invoice', limit=5)
frappe.get_doc('Company', 'Global Trading Company Ltd').as_dict()
```

### Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
df -h
docker system df

# Clean up old Docker data
docker system prune -a
```

---

## 🧪 Testing API Endpoints

```bash
# Ping
curl http://localhost:8080/api/method/ping

# Login
curl -X POST http://localhost:8080/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr":"demo.admin@traderapp.com","pwd":"Demo@12345"}'

# Dashboard KPIs (requires auth cookie)
curl http://localhost:8080/api/method/trader_app.api.dashboard.get_dashboard_kpis \
  -H "Cookie: sid=<session-id-from-login>"
```

---

## 🎯 Quick Command Reference

| Task | Command |
|------|---------|
| **Start** | `docker compose up -d` |
| **Stop** | `docker compose down` |
| **Restart** | `docker compose restart` |
| **Logs** | `docker compose logs -f` |
| **Backup** | `./scripts/backup.sh` |
| **Deploy** | `./scripts/deploy.sh` |
| **Console** | `docker compose exec backend bench --site <site> console` |
| **Migrate** | `docker compose exec backend bench --site <site> migrate` |
| **Update** | `git pull && ./scripts/deploy.sh` |

---

## 📊 Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8000 | http://localhost:8000 |
| Proxy | 8080 | http://localhost:8080 |
| Database | 3306 | localhost:3306 |
| Redis Cache | 6379 | localhost:6379 |
| Redis Queue | 6380 | localhost:6380 |

---

## 🆘 Common Issues

### "Port already in use"

```bash
# Change ports in compose/.env:
HTTP_PORT=8081
BACKEND_PORT=8001
FRONTEND_PORT=3001

# Then restart
docker compose down
docker compose up -d
```

### "Database connection failed"

```bash
# Check DB container
docker compose ps db
docker compose logs db

# Restart DB
docker compose restart db
```

### "Site not found"

```bash
# List sites
docker compose exec backend bench --site all list-apps

# If empty, site wasn't created — check logs
docker compose logs backend | grep -i error
```

### "Frontend shows blank page"

```bash
# Check frontend build
docker compose logs frontend

# Rebuild
docker compose build frontend
docker compose restart frontend
```

---

## 🎓 Next Steps

1. ✅ Deploy locally to test
2. ✅ Review demo data (Sales, Purchases, Inventory)
3. ✅ Customize company settings in Settings page
4. ✅ Setup production server with SSL
5. ✅ Configure automated backups
6. ✅ Setup monitoring (optional)

**Documentation:**
- Architecture: `docs/ARCHITECTURE.md`
- API Reference: `docs/API_REFERENCE.md`
- Deployment Guide: `docs/DEPLOYMENT_GUIDE.md`

**Support:** https://github.com/Syedirtiza768/traders/issues
