# Frontend Dockerfile — Trader UI (React + Vite)

# syntax=docker/dockerfile:1.6

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# More resilient registry fetches (Docker Desktop / intermittent networks)
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000

# Copy package files first for better caching
COPY frontend/trader-ui/package.json frontend/trader-ui/package-lock.json ./

# Prefer reproducible ci; retry, then fall back to install.
# Cache mount speeds rebuilds and reduces flaky registry timeouts.
RUN --mount=type=cache,target=/root/.npm \
    set -eu; \
    ok=0; \
    for attempt in 1 2 3; do \
      echo "npm install attempt $${attempt}…"; \
      if npm ci --no-audit --no-fund; then ok=1; break; fi; \
      echo "npm ci failed on attempt $${attempt}"; \
      rm -rf node_modules; \
      sleep $((attempt * 5)); \
    done; \
    if [ "$${ok}" != "1" ]; then \
      echo "npm ci exhausted — falling back to npm install"; \
      rm -rf node_modules; \
      npm install --no-audit --no-fund; \
    fi; \
    test -x node_modules/.bin/tsc; \
    test -x node_modules/.bin/vite

# Copy source
COPY frontend/trader-ui/ .

# Build for production.
# No VITE_* env vars are needed: API routing is handled entirely by the Nginx
# reverse proxy (proxy.conf). The Axios base URL in api.ts is always '/'.
RUN npm run build

# --- Production stage ---
FROM nginx:1.25-alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
