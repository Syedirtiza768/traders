# Backend Dockerfile — Frappe + ERPNext + Trader App
# Based on official Frappe Docker images

ARG FRAPPE_VERSION=version-15
ARG ERPNEXT_VERSION=version-15

FROM frappe/bench:latest

ARG FRAPPE_VERSION
ARG ERPNEXT_VERSION

USER frappe

# Initialize bench
RUN bench init \
    --frappe-branch ${FRAPPE_VERSION} \
    --skip-redis-config-generation \
    --python python3.11 \
    /home/frappe/frappe-bench

WORKDIR /home/frappe/frappe-bench

# Get ERPNext
RUN bench get-app --branch ${ERPNEXT_VERSION} erpnext

# Copy and install trader_app
COPY --chown=frappe:frappe apps/trader_app /home/frappe/frappe-bench/apps/trader_app
RUN cd apps/trader_app && pip install -e .

# Expose ports
EXPOSE 8000 9000

# Default command
CMD ["bench", "start"]
