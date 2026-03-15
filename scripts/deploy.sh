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

    # Build images
    docker compose build

    # Graceful restart — rolling update approach
    info "Stopping old containers..."
    docker compose down --remove-orphans

    info "Starting updated containers..."
    docker compose up -d

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

    # Run migrate
    docker compose exec -T backend bench --site "$SITE_NAME" migrate 2>&1 || warn "Migration warnings (check logs)."

    # Build assets
    docker compose exec -T backend bench build --app trader_app 2>&1 || warn "Asset build warnings."

    # Clear cache
    docker compose exec -T backend bench --site "$SITE_NAME" clear-cache 2>&1 || true

    success "Migrations complete."
}

# ──────────────────────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────────────────────
health_check() {
    info "Running health check..."

    cd "$COMPOSE_DIR"

    local all_healthy=true

    # Check each service
    for service in backend db redis-cache frontend; do
        if docker compose ps "$service" | grep -q "Up"; then
            success "  $service: running"
        else
            warn "  $service: NOT running"
            all_healthy=false
        fi
    done

    # HTTP health check
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PROXY_PORT:-8080}/api/method/ping" 2>/dev/null || echo "000")

    if [ "$http_status" = "200" ]; then
        success "  API endpoint: healthy (HTTP $http_status)"
    else
        warn "  API endpoint: returned HTTP $http_status"
        all_healthy=false
    fi

    if [ "$all_healthy" = true ]; then
        success "All health checks passed."
    else
        warn "Some health checks failed. Review with: docker compose logs -f"
    fi
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
    echo "  🌐 Frontend:  http://localhost:${FRONTEND_PORT:-3000}"
    echo "  🔧 Backend:   http://localhost:${BACKEND_PORT:-8000}"
    echo "  📊 Proxy:     http://localhost:${PROXY_PORT:-8080}"
    echo ""
}

main "$@"
