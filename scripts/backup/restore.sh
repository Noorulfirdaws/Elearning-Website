#!/usr/bin/env bash
# ============================================================
#  LMS Platform — Restore Script
#  Restores PostgreSQL from a backup set.
#
#  Usage:
#    ./scripts/backup/restore.sh --backup-dir ./backups/20260607_220000
#    ./scripts/backup/restore.sh --latest          # auto-pick newest
#    ./scripts/backup/restore.sh --s3-key lms-backups/20260607_220000
#
#  DANGER: This will DROP and recreate the lms database!
#          Always run in a test environment first.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
DB_CONTAINER="${DB_CONTAINER:-djib-taxi-db}"
DB_NAME="${DB_NAME:-lms}"
DB_USER="${DB_USER:-postgres}"
DRY_RUN=false
RESTORE_FROM=""
USE_LATEST=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --backup-dir) RESTORE_FROM="$2"; shift ;;
    --latest)     USE_LATEST=true ;;
    --dry-run)    DRY_RUN=true ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die()  { log "ERROR: $*"; exit 1; }

# ─── Find backup to restore ──────────────────────────────────────────────────
if $USE_LATEST; then
  RESTORE_FROM=$(find "$BACKUP_DIR" -maxdepth 1 -type d | sort | tail -1)
  [[ -d "$RESTORE_FROM" ]] || die "No backups found in $BACKUP_DIR"
fi

[[ -n "$RESTORE_FROM" ]] || die "Specify --backup-dir PATH or --latest"
[[ -d "$RESTORE_FROM" ]] || die "Backup directory not found: $RESTORE_FROM"

log "==== LMS Restore Started ===="
log "Source:     $RESTORE_FROM"
log "DB:         $DB_NAME on container $DB_CONTAINER"
log "Dry run:    $DRY_RUN"

PG_FILE=$(find "$RESTORE_FROM/postgres" -name "*.sql.gz" 2>/dev/null | head -1)
[[ -n "$PG_FILE" ]] || die "No PostgreSQL dump found in $RESTORE_FROM/postgres/"

log "Dump file: $PG_FILE ($(du -sh "$PG_FILE" | cut -f1))"

# ─── Confirm (skip in dry-run) ───────────────────────────────────────────────
if ! $DRY_RUN; then
  echo ""
  echo "  ⚠️  WARNING: This will DROP the '$DB_NAME' database and restore from backup!"
  echo "  Type 'yes' to continue, or Ctrl+C to abort:"
  read -r confirm
  [[ "$confirm" == "yes" ]] || { log "Aborted by user"; exit 1; }
fi

# ─── Restore PostgreSQL ───────────────────────────────────────────────────────
log "--- Restoring PostgreSQL ---"
if $DRY_RUN; then
  log "[DRY] Would drop $DB_NAME and restore from $PG_FILE"
else
  # Copy dump into container
  CONTAINER_DUMP="/tmp/lms_restore_$(date +%s).sql.gz"
  docker cp "$PG_FILE" "$DB_CONTAINER:$CONTAINER_DUMP"

  # Drop and recreate DB
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
  " postgres 2>/dev/null || true

  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" postgres
  log "Database recreated"

  # Restore
  docker exec "$DB_CONTAINER" bash -c \
    "gunzip -c $CONTAINER_DUMP | pg_restore -U $DB_USER -d $DB_NAME --no-owner --no-privileges -v 2>&1 | tail -5"

  # Cleanup
  docker exec "$DB_CONTAINER" rm -f "$CONTAINER_DUMP"
  log "✅ PostgreSQL restored"
fi

# ─── Post-restore validation ─────────────────────────────────────────────────
log "--- Post-restore validation ---"
if $DRY_RUN; then
  log "[DRY] Would validate table row counts"
else
  TABLES=("users" "courses" "enrollments" "payments")
  for table in "${TABLES[@]}"; do
    COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
      -t -c "SELECT COUNT(*) FROM \"$table\" LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "ERROR")
    if [[ "$COUNT" =~ ^[0-9]+$ ]]; then
      log "  ✅ $table: $COUNT rows"
    else
      log "  ⚠️  $table: could not count (table may not exist yet)"
    fi
  done
fi

log "==== Restore Complete ===="
