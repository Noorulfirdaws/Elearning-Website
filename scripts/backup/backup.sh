#!/usr/bin/env bash
# ============================================================
#  LMS Platform — Automated Backup Script
#  Backs up: PostgreSQL, Redis RDB, .env configs
#
#  Usage:
#    ./scripts/backup/backup.sh [--dry-run] [--s3]
#
#  Env vars:
#    BACKUP_DIR      — local destination (default: ./backups)
#    RETENTION_DAYS  — days to keep local backups (default: 7)
#    S3_BUCKET       — S3 bucket for off-site storage
#    DB_CONTAINER    — Postgres container name (default: djib-taxi-db)
#    REDIS_CONTAINER — Redis container name    (default: lms-redis)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_CONTAINER="${DB_CONTAINER:-djib-taxi-db}"
REDIS_CONTAINER="${REDIS_CONTAINER:-lms-redis}"
DB_NAME="${DB_NAME:-lms}"
DB_USER="${DB_USER:-postgres}"
DRY_RUN=false
UPLOAD_S3=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true ;;
    --s3)      UPLOAD_S3=true ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="$BACKUP_DIR/$TIMESTAMP"
LOG_FILE="$BACKUP_DIR/backup.log"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
die()  { log "ERROR: $*"; exit 1; }

# ─── Pre-flight ───────────────────────────────────────────────────────────────
log "==== LMS Backup Started ===="
log "Timestamp : $TIMESTAMP"
log "Dry run   : $DRY_RUN"
log "Backup dir: $BACKUP_ROOT"

if ! command -v docker &>/dev/null; then
  die "docker not found"
fi

$DRY_RUN || mkdir -p "$BACKUP_ROOT"/{postgres,redis,configs}

# ─── 1. PostgreSQL Dump ────────────────────────────────────────────────────────
log "--- PostgreSQL backup ---"
PG_FILE="$BACKUP_ROOT/postgres/lms_${TIMESTAMP}.sql.gz"

if $DRY_RUN; then
  log "[DRY] Would run: docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > $PG_FILE"
else
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    die "Postgres container '$DB_CONTAINER' is not running"
  fi
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
    --no-password \
    --format=custom \
    --compress=9 \
    --verbose \
    2>>"$LOG_FILE" | gzip > "$PG_FILE"

  PG_SIZE=$(du -sh "$PG_FILE" | cut -f1)
  log "PostgreSQL dump: $PG_FILE ($PG_SIZE)"

  # Verify dump integrity
  if docker exec "$DB_CONTAINER" pg_restore --list /dev/stdin <"$PG_FILE" &>/dev/null 2>&1; then
    log "✅ PostgreSQL dump integrity verified"
  else
    log "⚠️  pg_restore verify failed — checking file size..."
    [[ -s "$PG_FILE" ]] || die "Dump file is empty"
  fi
fi

# ─── 2. Redis RDB Snapshot ────────────────────────────────────────────────────
log "--- Redis backup ---"
REDIS_FILE="$BACKUP_ROOT/redis/redis_${TIMESTAMP}.rdb.gz"

if $DRY_RUN; then
  log "[DRY] Would trigger BGSAVE and copy dump.rdb"
else
  if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    log "⚠️  Redis container '$REDIS_CONTAINER' not running — skipping Redis backup"
  else
    # Trigger background save
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
    # Wait for save to complete (max 30s)
    for i in {1..30}; do
      STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
      sleep 1
      NEW_STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
      [[ "$NEW_STATUS" != "$STATUS" ]] && break
    done

    # Copy dump.rdb out of container
    REDIS_TMP="$BACKUP_ROOT/redis/dump_${TIMESTAMP}.rdb"
    docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$REDIS_TMP" 2>/dev/null || \
    docker cp "$REDIS_CONTAINER:/var/lib/redis/dump.rdb" "$REDIS_TMP" 2>/dev/null || \
      log "⚠️  Could not copy Redis dump — Redis may have no data yet"

    if [[ -f "$REDIS_TMP" ]]; then
      gzip -9 -c "$REDIS_TMP" > "$REDIS_FILE"
      rm "$REDIS_TMP"
      REDIS_SIZE=$(du -sh "$REDIS_FILE" | cut -f1)
      log "✅ Redis dump: $REDIS_FILE ($REDIS_SIZE)"
    fi
  fi
fi

# ─── 3. Config Files ──────────────────────────────────────────────────────────
log "--- Config backup ---"
CONFIG_ARCHIVE="$BACKUP_ROOT/configs/configs_${TIMESTAMP}.tar.gz"

if $DRY_RUN; then
  log "[DRY] Would archive .env files and monitoring configs"
else
  # Redact secrets before backing up .env
  REDACTED_ENV="$BACKUP_ROOT/configs/api.env.redacted"
  if [[ -f "$ROOT_DIR/apps/api/.env" ]]; then
    sed 's/\(SECRET\|PASSWORD\|KEY\|TOKEN\)=.*/\1=<REDACTED>/ig' \
      "$ROOT_DIR/apps/api/.env" > "$REDACTED_ENV"
  fi

  tar -czf "$CONFIG_ARCHIVE" \
    -C "$ROOT_DIR" \
    monitoring/prometheus/prometheus.yml \
    monitoring/prometheus/rules/ \
    monitoring/alertmanager/alertmanager.yml \
    monitoring/grafana/dashboards/ \
    monitoring/grafana/provisioning/ \
    "$REDACTED_ENV" \
    2>/dev/null || true

  CONFIG_SIZE=$(du -sh "$CONFIG_ARCHIVE" | cut -f1)
  log "✅ Config archive: $CONFIG_ARCHIVE ($CONFIG_SIZE)"
fi

# ─── 4. Upload to S3 ─────────────────────────────────────────────────────────
if $UPLOAD_S3 && [[ -n "${S3_BUCKET:-}" ]]; then
  log "--- S3 upload ---"
  if $DRY_RUN; then
    log "[DRY] Would upload to s3://$S3_BUCKET/lms-backups/$TIMESTAMP/"
  else
    aws s3 sync "$BACKUP_ROOT" "s3://$S3_BUCKET/lms-backups/$TIMESTAMP/" \
      --storage-class STANDARD_IA \
      --only-show-errors \
      2>>"$LOG_FILE"
    log "✅ Uploaded to s3://$S3_BUCKET/lms-backups/$TIMESTAMP/"
  fi
fi

# ─── 5. Prune old backups ─────────────────────────────────────────────────────
log "--- Pruning backups older than ${RETENTION_DAYS} days ---"
if $DRY_RUN; then
  log "[DRY] Would delete backups older than $RETENTION_DAYS days"
else
  find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" \
    ! -name "$(basename "$BACKUP_DIR")" \
    -exec rm -rf {} + 2>/dev/null || true
  REMAINING=$(find "$BACKUP_DIR" -maxdepth 1 -type d | wc -l)
  log "Remaining backup sets: $((REMAINING - 1))"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
log "==== Backup Complete ===="
if ! $DRY_RUN; then
  TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
  log "Total size: $TOTAL_SIZE"
fi
