#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Database backup script for CallQA
# Dumps PostgreSQL, compresses with gzip, optionally uploads to S3.
#
# Usage:
#   ./scripts/backup.sh              # local backup only
#   ./scripts/backup.sh --s3         # local + upload to S3
#
# Environment variables (from .env or export):
#   POSTGRES_USER       (default: callcenter)
#   POSTGRES_PASSWORD    (default: callcenter_secret)
#   POSTGRES_DB         (default: callcenter)
#   DB_CONTAINER        (default: callcenter_db)
#   BACKUP_DIR          (default: ./backups)
#   BACKUP_KEEP_DAYS    (default: 30)
#   S3_BACKUP_BUCKET    (required for --s3)
#   S3_BACKUP_PREFIX    (default: callqa-backups/)
#   AWS_ACCESS_KEY_ID   (required for --s3)
#   AWS_SECRET_ACCESS_KEY (required for --s3)
#   AWS_DEFAULT_REGION  (default: eu-central-1)
#
# Crontab example (daily at 3:00 AM):
#   0 3 * * * cd /path/to/call-center-dashboard && ./scripts/backup.sh --s3 >> ./backups/backup.log 2>&1
# ─────────────────────────────────────────────────────────

set -euo pipefail

# Load .env if present
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Config
DB_USER="${POSTGRES_USER:-callcenter}"
DB_PASS="${POSTGRES_PASSWORD:-callcenter_secret}"
DB_NAME="${POSTGRES_DB:-callcenter}"
CONTAINER="${DB_CONTAINER:-callcenter_db}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILENAME="callqa_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

UPLOAD_S3=false
if [[ "${1:-}" == "--s3" ]]; then
  UPLOAD_S3=true
fi

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Create backup dir
mkdir -p "$BACKUP_DIR"

# Dump
log "Starting backup: $FILENAME"
docker exec -e PGPASSWORD="$DB_PASS" "$CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip > "$FILEPATH"

SIZE=$(du -h "$FILEPATH" | cut -f1)
log "Backup created: $FILEPATH ($SIZE)"

# Cleanup old backups
DELETED=$(find "$BACKUP_DIR" -name "callqa_*.sql.gz" -mtime +"$KEEP_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "Deleted $DELETED backup(s) older than $KEEP_DAYS days"
fi

# Upload to S3
if [ "$UPLOAD_S3" = true ]; then
  BUCKET="${S3_BACKUP_BUCKET:-}"
  PREFIX="${S3_BACKUP_PREFIX:-callqa-backups/}"
  REGION="${AWS_DEFAULT_REGION:-eu-central-1}"

  if [ -z "$BUCKET" ]; then
    log "ERROR: S3_BACKUP_BUCKET not set. Skipping upload."
    exit 1
  fi

  S3_PATH="s3://${BUCKET}/${PREFIX}${FILENAME}"
  log "Uploading to $S3_PATH ..."

  aws s3 cp "$FILEPATH" "$S3_PATH" --region "$REGION" --quiet
  log "Upload complete: $S3_PATH"

  # Cleanup old S3 backups (list, filter by age)
  log "Cleaning up S3 backups older than $KEEP_DAYS days ..."
  CUTOFF_DATE="$(date -d "-${KEEP_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${KEEP_DAYS}d +%Y-%m-%d)"
  aws s3 ls "s3://${BUCKET}/${PREFIX}" --region "$REGION" | while read -r line; do
    FILE_DATE="$(echo "$line" | awk '{print $1}')"
    FILE_NAME="$(echo "$line" | awk '{print $4}')"
    if [ -n "$FILE_NAME" ] && [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
      aws s3 rm "s3://${BUCKET}/${PREFIX}${FILE_NAME}" --region "$REGION" --quiet
      log "Deleted old S3 backup: $FILE_NAME"
    fi
  done
fi

log "Backup complete."
