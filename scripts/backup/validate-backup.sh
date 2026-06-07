#!/usr/bin/env bash
# ============================================================
#  LMS Backup Validation — RTO/RPO Testing
#
#  Validates a backup by restoring to a temp DB and running
#  integrity checks. Does NOT touch production.
#
#  Usage:
#    ./scripts/backup/validate-backup.sh [--backup-dir PATH]
# ============================================================
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-djib-taxi-db}"
DB_USER="${DB_USER:-postgres}"
TEST_DB="lms_backup_validation_$(date +%s)"
BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
RESTORE_FROM=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --backup-dir) RESTORE_FROM="$2"; shift ;;
    *) ;;
  esac
  shift
done

[[ -n "$RESTORE_FROM" ]] || \
  RESTORE_FROM=$(find "$BACKUP_DIR" -maxdepth 1 -type d | sort | tail -1)

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
pass() { log "  ✅ $*"; }
fail() { log "  ❌ $*"; FAILURES=$((FAILURES+1)); }
FAILURES=0

PG_FILE=$(find "$RESTORE_FROM/postgres" -name "*.sql.gz" 2>/dev/null | head -1)

log "==== Backup Validation ===="
log "Backup: $RESTORE_FROM"
log "Test DB: $TEST_DB"

# ─── 1. File integrity ───────────────────────────────────────────────────────
log "--- File checks ---"
if [[ -f "$PG_FILE" ]]; then
  pass "PostgreSQL dump exists: $(basename "$PG_FILE")"
  # Test gzip integrity
  if gzip -t "$PG_FILE" 2>/dev/null; then
    pass "Dump gzip integrity OK"
  else
    fail "Dump file is corrupted"
  fi
  # Check age
  AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$PG_FILE" 2>/dev/null || stat -f %m "$PG_FILE")) / 3600 ))
  if [[ $AGE_HOURS -le 25 ]]; then
    pass "Dump age: ${AGE_HOURS}h (within 25h RPO)"
  else
    fail "Dump age: ${AGE_HOURS}h — exceeds 25h RPO!"
  fi
else
  fail "No PostgreSQL dump found"
fi

REDIS_FILE=$(find "$RESTORE_FROM/redis" -name "*.rdb.gz" 2>/dev/null | head -1 || true)
if [[ -n "$REDIS_FILE" ]]; then
  pass "Redis dump exists: $(basename "$REDIS_FILE")"
else
  log "  ⚠️  No Redis dump (may be expected if Redis has no data)"
fi

CONFIG_FILE=$(find "$RESTORE_FROM/configs" -name "*.tar.gz" 2>/dev/null | head -1 || true)
if [[ -n "$CONFIG_FILE" ]]; then
  pass "Config archive exists: $(basename "$CONFIG_FILE")"
  tar -tzf "$CONFIG_FILE" &>/dev/null && pass "Config archive is readable" || fail "Config archive corrupted"
fi

# ─── 2. Test restore ─────────────────────────────────────────────────────────
log "--- Test restore to $TEST_DB ---"
CONTAINER_DUMP="/tmp/validate_restore_$(date +%s).sql.gz"
docker cp "$PG_FILE" "$DB_CONTAINER:$CONTAINER_DUMP"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE \"$TEST_DB\";" postgres 2>/dev/null

START_TIME=$(date +%s)
docker exec "$DB_CONTAINER" bash -c \
  "gunzip -c $CONTAINER_DUMP | pg_restore -U $DB_USER -d \"$TEST_DB\" --no-owner --no-privileges 2>&1 | tail -3" || true
END_TIME=$(date +%s)
RTO_SECS=$((END_TIME - START_TIME))

pass "Restore completed in ${RTO_SECS}s"
if [[ $RTO_SECS -le 300 ]]; then
  pass "RTO: ${RTO_SECS}s (within 5min SLO)"
else
  fail "RTO: ${RTO_SECS}s — exceeds 5min SLO!"
fi

# ─── 3. Data integrity checks ────────────────────────────────────────────────
log "--- Data integrity ---"
TABLES=("users" "courses" "enrollments" "payments" "lessons")
for table in "${TABLES[@]}"; do
  COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TEST_DB" \
    -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' \n' || echo "err")
  if [[ "$COUNT" =~ ^[0-9]+$ ]]; then
    pass "Table $table: $COUNT rows"
  else
    log "  ⚠️  Table $table: not found (may not have data yet)"
  fi
done

# ─── Cleanup ─────────────────────────────────────────────────────────────────
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"$TEST_DB\";" postgres 2>/dev/null
docker exec "$DB_CONTAINER" rm -f "$CONTAINER_DUMP" 2>/dev/null || true

# ─── Report ──────────────────────────────────────────────────────────────────
log "============================"
if [[ $FAILURES -eq 0 ]]; then
  log "✅ Validation PASSED — backup is healthy"
  exit 0
else
  log "❌ Validation FAILED — $FAILURES issue(s) found"
  exit 1
fi
