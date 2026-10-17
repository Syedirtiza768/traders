#!/usr/bin/env bash
# ============================================================================
# Trader Business System — Backup Script
# ============================================================================
# Usage:  chmod +x scripts/backup.sh && ./scripts/backup.sh
#
# Creates timestamped backups of:
#   1. MariaDB database
#   2. Frappe site files (uploaded attachments, etc.)
#   3. Site configuration needed to restore encrypted values
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

# ──────────────────────────────────────────────────────────────────────────────
# Load environment and configuration
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$PROJECT_DIR/compose"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$COMPOSE_DIR/.env}"

if [ ! -f "$COMPOSE_ENV_FILE" ]; then
    error "Environment file not found: $COMPOSE_ENV_FILE"
fi

set -a
source "$COMPOSE_ENV_FILE"
set +a

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="trader_backup_${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
SITE_NAME="${SITE_NAME:-trader.localhost}"

# Match the project used by `docker compose up`. Compose derives the default
# project name from this directory (`compose`) unless the deployment sets one.
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-compose}"
compose() {
    docker compose \
        --project-directory "$COMPOSE_DIR" \
        --env-file "$COMPOSE_ENV_FILE" \
        -f "$COMPOSE_DIR/docker-compose.yml" \
        -p "$COMPOSE_PROJECT_NAME" \
        "$@"
}

# ──────────────────────────────────────────────────────────────────────────────
# Create Backup Directory
# ──────────────────────────────────────────────────────────────────────────────
prepare() {
    info "Preparing backup directory..."
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    chmod 700 "$BACKUP_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/site_backups" \
        "$BACKUP_DIR/$BACKUP_NAME/public_files" \
        "$BACKUP_DIR/$BACKUP_NAME/private_files"
    success "Backup directory: $BACKUP_DIR/$BACKUP_NAME"
}

# ──────────────────────────────────────────────────────────────────────────────
# Database Backup
# ──────────────────────────────────────────────────────────────────────────────
backup_database() {
    info "Creating a site-consistent database and file backup..."

    compose exec -T backend bench --site "$SITE_NAME" backup --with-files

    success "Frappe database, file, and site-configuration backup created"
}

# ──────────────────────────────────────────────────────────────────────────────
# Site Files Backup
# ──────────────────────────────────────────────────────────────────────────────
backup_site_files() {
    info "Backing up site files..."

    # Copy the backups from the container
    local container_id
    container_id=$(compose ps -q backend)
    if [ -z "$container_id" ]; then
        error "Could not find the backend container for project $COMPOSE_PROJECT_NAME"
    fi

    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups/." \
        "$BACKUP_DIR/$BACKUP_NAME/site_backups/"

    # Also backup uploaded files
    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/public/files/." \
        "$BACKUP_DIR/$BACKUP_NAME/public_files/"

    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/private/files/." \
        "$BACKUP_DIR/$BACKUP_NAME/private_files/"

    # This file can contain encryption keys and database credentials. It is
    # included for restore correctness and protected by the backup directory
    # and archive permissions.
    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/site_config.json" \
        "$BACKUP_DIR/$BACKUP_NAME/site_config.json"

    local backup_size
    backup_size=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    success "Site files and configuration backup complete ($backup_size)"
}

# ──────────────────────────────────────────────────────────────────────────────
# Compress Final Backup
# ──────────────────────────────────────────────────────────────────────────────
compress_backup() {
    info "Compressing backup archive..."

    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    chmod 600 "${BACKUP_NAME}.tar.gz"
    rm -rf "$BACKUP_NAME"

    local archive_size
    archive_size=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    success "Backup archive: ${BACKUP_NAME}.tar.gz ($archive_size)"
}

# ──────────────────────────────────────────────────────────────────────────────
# Cleanup Old Backups
# ──────────────────────────────────────────────────────────────────────────────
cleanup_old_backups() {
    info "Cleaning up backups older than $RETENTION_DAYS days..."

    local count
    count=$(find "$BACKUP_DIR" -name "trader_backup_*.tar.gz" -mtime +"$RETENTION_DAYS" | wc -l)

    if [ "$count" -gt 0 ]; then
        find "$BACKUP_DIR" -name "trader_backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
        success "Removed $count old backup(s)"
    else
        info "No old backups to clean up."
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔═══════════════════════════════════════════╗"
    echo "║   Trader Business System — Backup         ║"
    echo "╚═══════════════════════════════════════════╝"
    echo ""

    prepare
    backup_database
    backup_site_files
    compress_backup
    cleanup_old_backups

    echo ""
    echo "=========================================="
    echo "  Backup complete: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "=========================================="
    echo ""
}

main "$@"
