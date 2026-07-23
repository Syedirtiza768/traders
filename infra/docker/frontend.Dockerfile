# Frontend Dockerfile — Trader UI (React + Vite)
#
# Uses Debian-based Node (not Alpine): npm on Alpine/musl has been observed to
# abort with "Exit handler never called!" leaving node_modules incomplete.

FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY frontend/trader-ui/package.json frontend/trader-ui/package-lock.json ./
COPY infra/docker/frontend-npm-install.sh /tmp/frontend-npm-install.sh

RUN --mount=type=cache,target=/root/.npm \
    chmod +x /tmp/frontend-npm-install.sh \
    && sh /tmp/frontend-npm-install.sh

COPY frontend/trader-ui/ .

# No VITE_* env vars are needed: API routing is handled by the Nginx reverse proxy.
RUN npm run build

FROM nginx:1.25-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
