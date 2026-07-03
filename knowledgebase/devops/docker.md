# Docker Best Practices

## Purpose

Define Docker best practices for containerized applications.

**Last Verified**: June 2026
**Docker Version**: v28

---

## Dockerfile Best Practices

### Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM node:24-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production dependencies only
RUN npm prune --production

# Stage 2: Production
FROM node:24-slim

# Security: non-root user
RUN addgroup --system app && adduser --system --group app

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./

# Switch to non-root
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### Dockerignore

```
node_modules
.git
.env
.env.local
dist
coverage
*.md
.github
```

---

## Image Optimization

### Layer Caching

```dockerfile
# Copy package files first (changes less frequently)
COPY package*.json ./
RUN npm ci

# Copy source code (changes more frequently)
COPY . .
```

### Image Size

```bash
# Check image size
docker images myapp:latest

# Analyze layers
docker history myapp:latest

# Use slim base images
FROM node:24-slim  # ~180MB vs ~900MB for full
```

---

## Security

### Scan Images

```bash
# Trivy
trivy image myapp:latest

# Docker Scout
docker scout cves myapp:latest
```

### Run as Non-Root

```dockerfile
RUN addgroup --system app && adduser --system --group app
USER app
```

### Read-Only Filesystem

```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
```

---

## Docker Compose

### Production Configuration

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  db:
    image: postgres:17
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    restart: unless-stopped

volumes:
  postgres_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## Networking

### Internal Communication

```yaml
services:
  app:
    networks:
      - frontend
      - backend
  
  db:
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true  # No external access
```

---

## Volumes

### Named Volumes

```yaml
services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
    driver: local
```

### Bind Mounts (Development)

```yaml
services:
  app:
    volumes:
      - ./src:/app/src
      - /app/node_modules  # Anonymous volume to prevent overwrite
```

---

## Anti-Patterns

- **Using latest tag**: Pin specific versions
- **Running as root**: Always use non-root user
- **No .dockerignore**: Always include it
- **Single stage build**: Use multi-stage for smaller images
- **Storing secrets in image**: Use environment variables
- **No health checks**: Always include healthcheck

---

## Verification Checklist

- [ ] Multi-stage build configured
- [ ] Non-root user configured
- [ ] .dockerignore configured
- [ ] Image scanned for vulnerabilities
- [ ] Health checks configured
- [ ] Resource limits configured
- [ ] Logging configured
- [ ] Secrets managed securely
