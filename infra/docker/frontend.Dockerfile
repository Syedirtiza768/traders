# Frontend Dockerfile — Trader UI (React + Vite)

# --- Build stage ---
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files first for better caching
COPY frontend/trader-ui/package.json frontend/trader-ui/package-lock.json* ./
RUN npm ci --no-audit

# Copy source
COPY frontend/trader-ui/ .

# Build for production
ARG VITE_API_URL=/api
ARG VITE_SITE_NAME=trader.localhost
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SITE_NAME=${VITE_SITE_NAME}

RUN npm run build

# --- Production stage ---
FROM nginx:1.25-alpine as production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
