# VPS Deployment

## Purpose

Define deployment patterns for small-scale VPS environments.

**Last Verified**: June 2026

---

## Stack

- **OS**: Ubuntu 24.04 LTS
- **Runtime**: Node.js 24 LTS (via nvm)
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL 17
- **Cache**: Redis 7
- **SSL**: Let's Encrypt (Certbot)

---

## Server Setup

### Initial Configuration

```bash
# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl git build-essential

# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server
```

### Database Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE USER appuser WITH PASSWORD 'strong_password';
CREATE DATABASE appdb OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
\q
```

---

## Application Deployment

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'app',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '500M',
    error_file: '/var/log/pm2/app-error.log',
    out_file: '/var/log/pm2/app-out.log',
  }],
};
```

### Deploy Script

```bash
#!/bin/bash
# deploy.sh

# Pull latest code
cd /var/www/app
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm run build

# Run migrations
npx prisma migrate deploy

# Restart application
pm2 reload ecosystem.config.js

echo "Deployed successfully"
```

---

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # Static files
    location /_next/static/ {
        alias /var/www/app/.next/static/;
        expires 365d;
        access_log off;
    }

    # Proxy to Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## SSL Configuration

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d app.example.com

# Auto-renewal
systemctl enable certbot.timer
```

---

## Monitoring

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# PM2 Plus (optional)
pm2 link <secret> <public>
```

### System Monitoring

```bash
# Install Netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

---

## Backup

### Database Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-db.sh

BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U appuser appdb | gzip > "$BACKUP_DIR/appdb_$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Cron Job

```bash
# Run backup daily at 2 AM
0 2 * * * /opt/scripts/backup-db.sh
```

---

## Anti-Patterns

- **Running as root**: Use a dedicated user
- **No firewall**: Configure UFW
- **No monitoring**: Set up basic monitoring
- **No backups**: Automate backups
- **No SSL**: Always use HTTPS
- **Single process**: Use PM2 cluster mode

---

## Verification Checklist

- [ ] Server hardened (firewall, SSH keys, no root)
- [ ] Node.js installed via nvm
- [ ] PM2 configured with cluster mode
- [ ] Nginx configured as reverse proxy
- [ ] SSL configured with Let's Encrypt
- [ ] PostgreSQL secured
- [ ] Backups automated
- [ ] Monitoring configured
