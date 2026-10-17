#!/usr/bin/env bash
# ============================================================================
# Trader Business System — Deploy / Update Script
# ============================================================================
# Usage:  chmod +x scripts/deploy.sh && ./scripts/deploy.sh [--no-backup]
#
# Performs:
#   1. Pre-deployment backup (unless --no-backup)
#   2. Pulls latest code
#   3. Rebuilds Docker images
#   4. Runs database migrations
#   5. Restarts services
#   6. Health check
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ ${NC}$*"; }
success() { echo -e "${GREEN}✅ ${NC}$*"; }
warn()    { echo -e "${YELLOW}⚠️  ${NC}$*"; }
error()   { echo -e "${RED}❌ ${NC}$*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$PROJECT_DIR/compose"
SKIP_BACKUP=false

# Parse args
for arg in "$@"; do
    case $arg in
        --no-backup) SKIP_BACKUP=true ;;
        *) warn "Unknown argument: $arg" ;;
    esac
done

# Load env
if [ -f "$COMPOSE_DIR/.env" ]; then
    set -a
    source "$COMPOSE_DIR/.env"
    set +a
fi

SITE_NAME="${SITE_NAME:-trader.localhost}"

# ──────────────────────────────────────────────────────────────────────────────
# Pre-deployment Backup
# ──────────────────────────────────────────────────────────────────────────────
pre_deploy_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        warn "Skipping pre-deployment backup (--no-backup flag)."
        return
    fi

    info "Creating pre-deployment backup..."
    bash "$SCRIPT_DIR/backup.sh"
    success "Pre-deployment backup complete."
}

# ──────────────────────────────────────────────────────────────────────────────
# Pull Latest Code
# ──────────────────────────────────────────────────────────────────────────────
pull_latest() {
    info "Pulling latest code..."

    cd "$PROJECT_DIR"

    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        local current_branch
        current_branch=$(git branch --show-current)
        info "  Branch: $current_branch"

        git pull origin "$current_branch"
        success "Code updated."
    else
        warn "Not a git repository. Skipping pull."
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Build and Deploy
# ──────────────────────────────────────────────────────────────────────────────
build_and_deploy() {
    info "Building updated Docker images..."

    cd "$COMPOSE_DIR"

    # Recreate only services whose images/config changed. Persistent database,
    # Redis, and sites volumes remain mounted throughout the deployment.
    info "Starting updated containers..."
    docker compose up -d --build --remove-orphans

    success "Containers deployed."
}

# ──────────────────────────────────────────────────────────────────────────────
# Run Migrations
# ──────────────────────────────────────────────────────────────────────────────
run_migrations() {
    info "Running database migrations..."

    cd "$COMPOSE_DIR"

    # Wait for backend to be ready
    local max_wait=90
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if docker compose exec -T backend bench --site "$SITE_NAME" version >/dev/null 2>&1; then
            break
        fi
        sleep 5
        waited=$((waited + 5))
        info "  Waiting for backend... (${waited}s)"
    done

    if [ "$waited" -ge "$max_wait" ]; then
        error "Backend did not become ready within ${max_wait}s; stopping deployment before migrations."
    fi

    # A migration failure must stop the deployment; continuing would leave
    # application code and schema at incompatible versions.
    docker compose exec -T backend bench --site "$SITE_NAME" migrate

    # Build assets
    docker compose exec -T backend bench build --app trader_app

    # Clear cache
    docker compose exec -T backend bench --site "$SITE_NAME" clear-cache

    success "Migrations complete."
}

# ──────────────────────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────────────────────
health_check() {
    info "Running health check..."

    cd "$COMPOSE_DIR"

    # Compose health checks exist for these three services. Other services do
    # not yet expose reliable health checks and are reported as a known gap.
    for service in db backend frontend; do
        local container_id health
        container_id=$(docker compose ps -q "$service")
        if [ -z "$container_id" ]; then
            error "$service container is missing."
        fi
        health=$(docker inspect --format '{{.State.Health.Status}}' "$container_id")
        if [ "$health" != "healthy" ]; then
            error "$service health check is $health."
        fi
        success "  $service: healthy"
    done

    # HTTP health check
    if curl --fail --silent --show-error --max-time 30 \
        -H "Host: $SITE_NAME" \
        "http://127.0.0.1:${HTTP_PORT:-8080}/api/method/ping" >/dev/null; then
        success "  API endpoint: healthy"
    else
        error "API ping failed."
    fi

    success "Configured health checks passed. Inspect worker, scheduler, Redis, websocket, and proxy logs separately."
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔═══════════════════════════════════════════╗"
    echo "║   Trader Business System — Deploy         ║"
    echo "╚═══════════════════════════════════════════╝"
    echo ""

    local start_time=$SECONDS

    pre_deploy_backup
    pull_latest
    build_and_deploy
    run_migrations
    health_check

    local elapsed=$((SECONDS - start_time))

    echo ""
    echo "=========================================="
    echo "  Deployment complete in ${elapsed}s"
    echo "=========================================="
    echo ""
    echo "  🌐 Application: http://localhost:${HTTP_PORT:-8080}"
    echo ""
}

main "$@"
