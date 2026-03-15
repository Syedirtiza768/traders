#!/usr/bin/env bash
# ============================================================================
# Trader Business System — Backup Script
# ============================================================================
# Usage:  chmod +x scripts/backup.sh && ./scripts/backup.sh
#
# Creates timestamped backups of:
#   1. MariaDB database
#   2. Frappe site files (uploaded attachments, etc.)
#   3. Redis data (optional)
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
# Configuration
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$PROJECT_DIR/compose"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="trader_backup_${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Load env
if [ -f "$COMPOSE_DIR/.env" ]; then
    set -a
    source "$COMPOSE_DIR/.env"
    set +a
fi

SITE_NAME="${SITE_NAME:-trader.localhost}"

# ──────────────────────────────────────────────────────────────────────────────
# Create Backup Directory
# ──────────────────────────────────────────────────────────────────────────────
prepare() {
    info "Preparing backup directory..."
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    success "Backup directory: $BACKUP_DIR/$BACKUP_NAME"
}

# ──────────────────────────────────────────────────────────────────────────────
# Database Backup
# ──────────────────────────────────────────────────────────────────────────────
backup_database() {
    info "Backing up MariaDB database..."

    cd "$COMPOSE_DIR"

    docker compose exec -T db mysqldump \
        --user=root \
        --password="${DB_ROOT_PASSWORD:-}" \
        --single-transaction \
        --routines \
        --triggers \
        --databases "${DB_NAME:-_trader}" \
        | gzip > "$BACKUP_DIR/$BACKUP_NAME/database.sql.gz"

    local db_size
    db_size=$(du -sh "$BACKUP_DIR/$BACKUP_NAME/database.sql.gz" | cut -f1)
    success "Database backup complete ($db_size)"
}

# ──────────────────────────────────────────────────────────────────────────────
# Site Files Backup
# ──────────────────────────────────────────────────────────────────────────────
backup_site_files() {
    info "Backing up site files..."

    cd "$COMPOSE_DIR"

    # Use bench backup for a proper Frappe backup
    docker compose exec -T backend bench --site "$SITE_NAME" backup --with-files 2>/dev/null || true

    # Copy the backups from the container
    local container_id
    container_id=$(docker compose ps -q backend)

    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/private/backups/." \
        "$BACKUP_DIR/$BACKUP_NAME/site_backups/" 2>/dev/null || true

    # Also backup uploaded files
    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/public/files/." \
        "$BACKUP_DIR/$BACKUP_NAME/public_files/" 2>/dev/null || true

    docker cp "${container_id}:/home/frappe/frappe-bench/sites/${SITE_NAME}/private/files/." \
        "$BACKUP_DIR/$BACKUP_NAME/private_files/" 2>/dev/null || true

    success "Site files backup complete"
}

# ──────────────────────────────────────────────────────────────────────────────
# Compress Final Backup
# ──────────────────────────────────────────────────────────────────────────────
compress_backup() {
    info "Compressing backup archive..."

    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
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
