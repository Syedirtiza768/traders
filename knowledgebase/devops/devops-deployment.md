# DevOps and Deployment

## Purpose

Define deployment strategies and DevOps practices for modern applications.

**Last Verified**: June 2026

---

## Deployment Strategies

### Rolling Deployment

```
v1 → v1, v1, v1
v1 → v1, v2, v1
v1 → v2, v2, v1
v2 → v2, v2, v2
```

**Use when**: Zero-downtime deploys, gradual rollout.

### Blue-Green Deployment

```
Blue (v1) ← Live traffic
Green (v2) ← Staging traffic

Switch traffic:
Blue (v1) ← Idle
Green (v2) ← Live traffic
```

**Use when**: Instant rollback needed, critical systems.

### Canary Deployment

```
v1 (90% traffic)
v2 (10% traffic) ← Monitor for errors

If OK:
v2 (100% traffic)
```

**Use when**: Risk mitigation, gradual validation.

---

## Docker Deployment

### Production Dockerfile

```dockerfile
FROM node:24-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:24-slim

RUN addgroup --system app && adduser --system --group app
WORKDIR /app

COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:17
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

---

## Environment Management

### Environment Strategy

| Environment | Purpose | URL | Data |
|---|---|---|---|
| Local | Development | localhost | Seed data |
| Preview | PR testing | pr-123.preview.app.com | Test data |
| Staging | Pre-production | staging.app.com | Anonymized prod |
| Production | Live | app.com | Real data |

### Environment Variables

```bash
# .env.example (committed)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/app
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
```

---

## Health Checks

### Application Health

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION,
    };
  }

  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.ping();
    return { status: 'ready' };
  }
}
```

---

## Rollback Strategy

### Quick Rollback

```bash
# Docker
docker compose down
docker compose up -d --build

# Kubernetes
kubectl rollout undo deployment/app

# PM2
pm2 restart app
```

### Database Rollback

```bash
# Prisma
npx prisma migrate resolve --rolled-back <migration_name>

# Manual
psql -d app -f rollback.sql
```

---

## Anti-Patterns

- **Manual deployments**: Automate everything
- **No rollback plan**: Always have a rollback strategy
- **Deploying without tests**: Run tests before deploy
- **No health checks**: Implement health endpoints
- **No monitoring**: Monitor after deployment
- **Deploying on Friday**: Deploy early in the week

---

## Verification Checklist

- [ ] Deployment automated
- [ ] Rollback strategy defined
- [ ] Health checks implemented
- [ ] Monitoring configured
- [ ] Environment variables managed
- [ ] Secrets in secure storage
- [ ] Database migrations automated
- [ ] Zero-downtime deployment configured
