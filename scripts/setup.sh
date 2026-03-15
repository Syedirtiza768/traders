#!/usr/bin/env bash
# ============================================================================
# Trader Business System — Initial Setup Script
# ============================================================================
# Usage:  chmod +x scripts/setup.sh && ./scripts/setup.sh
# ============================================================================

set -euo pipefail

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ ${NC}$*"; }
success() { echo -e "${GREEN}✅ ${NC}$*"; }
warn()    { echo -e "${YELLOW}⚠️  ${NC}$*"; }
error()   { echo -e "${RED}❌ ${NC}$*"; exit 1; }

# ──────────────────────────────────────────────────────────────────────────────
# Pre-flight checks
# ──────────────────────────────────────────────────────────────────────────────
check_prerequisites() {
    info "Checking prerequisites..."

    command -v docker >/dev/null 2>&1 || error "Docker is not installed. Please install Docker first."
    command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed."
    command -v git >/dev/null 2>&1 || error "Git is not installed."

    # Check Docker daemon
    docker info >/dev/null 2>&1 || error "Docker daemon is not running. Please start Docker."

    success "All prerequisites met."
}

# ──────────────────────────────────────────────────────────────────────────────
# Environment Setup
# ──────────────────────────────────────────────────────────────────────────────
setup_environment() {
    info "Setting up environment..."

    COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../compose" && pwd)"
    ENV_FILE="${COMPOSE_DIR}/.env"
    ENV_EXAMPLE="${COMPOSE_DIR}/.env.example"

    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            warn "Created .env from .env.example — please review and update credentials."
        else
            error "No .env.example found in compose/ directory."
        fi
    else
        info ".env file already exists."
    fi

    # Generate random passwords if they're still set to defaults
    if grep -q "changeme" "$ENV_FILE" 2>/dev/null; then
        warn "Default passwords detected in .env — generating secure random passwords..."
        DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
        DB_ROOT_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
        ADMIN_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)

        sed -i "s/DB_PASSWORD=changeme/DB_PASSWORD=${DB_PASS}/" "$ENV_FILE"
        sed -i "s/DB_ROOT_PASSWORD=changeme/DB_ROOT_PASSWORD=${DB_ROOT_PASS}/" "$ENV_FILE"
        sed -i "s/ADMIN_PASSWORD=changeme/ADMIN_PASSWORD=${ADMIN_PASS}/" "$ENV_FILE"

        success "Passwords generated. Admin password: ${ADMIN_PASS}"
        warn "Save this password — it will not be shown again."
    fi

    success "Environment configured."
}

# ──────────────────────────────────────────────────────────────────────────────
# Build and Start Services
# ──────────────────────────────────────────────────────────────────────────────
build_and_start() {
    info "Building Docker images..."

    cd "$(dirname "${BASH_SOURCE[0]}")/../compose"

    docker compose build --no-cache

    info "Starting services..."
    docker compose up -d

    success "All services started."
}

# ──────────────────────────────────────────────────────────────────────────────
# Wait for Services
# ──────────────────────────────────────────────────────────────────────────────
wait_for_services() {
    info "Waiting for services to be healthy..."

    local max_wait=120
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if docker compose exec -T backend bench --site all list-apps >/dev/null 2>&1; then
            success "Backend is ready."
            return 0
        fi
        sleep 5
        waited=$((waited + 5))
        info "  Waiting... (${waited}s / ${max_wait}s)"
    done

    warn "Services may not be fully ready yet. Check logs with: docker compose logs -f"
}

# ──────────────────────────────────────────────────────────────────────────────
# Install Demo Data (optional)
# ──────────────────────────────────────────────────────────────────────────────
install_demo_data() {
    if [ "${INSTALL_DEMO:-false}" = "true" ]; then
        info "Installing demo data..."
        docker compose exec -T backend bench --site "$SITE_NAME" console <<'PYTHON'
from trader_app.demo import install_demo
install_demo()
PYTHON
        success "Demo data installed."
    else
        info "Skipping demo data installation. Set INSTALL_DEMO=true to install."
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Print Summary
# ──────────────────────────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo "=========================================="
    echo "  Trader Business System — Setup Complete"
    echo "=========================================="
    echo ""
    echo "  🌐 Frontend:  http://localhost:3000"
    echo "  🔧 Backend:   http://localhost:8000"
    echo "  📊 Proxy:     http://localhost:8080"
    echo ""
    echo "  📝 Default Admin Credentials:"
    echo "     Email:    Administrator"
    echo "     Password: (see .env ADMIN_PASSWORD)"
    echo ""
    echo "  📁 Useful commands:"
    echo "     docker compose logs -f        # View logs"
    echo "     docker compose ps             # Service status"
    echo "     docker compose restart        # Restart all"
    echo "     ./scripts/backup.sh           # Create backup"
    echo ""
    echo "=========================================="
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔═══════════════════════════════════════════╗"
    echo "║   Trader Business System — Setup          ║"
    echo "╚═══════════════════════════════════════════╝"
    echo ""

    check_prerequisites
    setup_environment

    # Source env vars
    source "$(dirname "${BASH_SOURCE[0]}")/../compose/.env"
    SITE_NAME="${SITE_NAME:-trader.localhost}"

    build_and_start
    wait_for_services
    install_demo_data
    print_summary
}

main "$@"
