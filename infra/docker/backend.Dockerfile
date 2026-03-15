# Backend Dockerfile — Frappe + ERPNext + Trader App
# Based on official Frappe Docker images

ARG FRAPPE_VERSION=v15.47.4
ARG ERPNEXT_VERSION=v15.37.2
ARG PYTHON_VERSION=3.11

FROM frappe/bench:latest as builder

ARG FRAPPE_VERSION
ARG ERPNEXT_VERSION

USER frappe

# Initialize bench
RUN bench init \
    --frappe-branch ${FRAPPE_VERSION} \
    --skip-redis-config-generation \
    --skip-assets \
    --python python3.11 \
    /home/frappe/frappe-bench

WORKDIR /home/frappe/frappe-bench

# Get ERPNext
RUN bench get-app --branch ${ERPNEXT_VERSION} --skip-assets erpnext

# Copy and install trader_app
COPY --chown=frappe:frappe apps/trader_app /home/frappe/frappe-bench/apps/trader_app
RUN bench get-app --skip-assets /home/frappe/frappe-bench/apps/trader_app

# Build assets
RUN bench build --production

# --- Production image ---
FROM frappe/frappe-worker:${FRAPPE_VERSION} as production

# Copy built bench
COPY --from=builder --chown=frappe:frappe /home/frappe/frappe-bench /home/frappe/frappe-bench

WORKDIR /home/frappe/frappe-bench

# Default command
CMD ["bench", "start"]
