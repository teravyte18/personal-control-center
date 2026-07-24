#!/bin/sh
set -eu

BACKUP_DIR="${PCC_BACKUP_DIR:-/backups}"
UPLOAD_DIR="${PCC_UPLOAD_DIR:-/uploads}"
INTERVAL_HOURS="${PCC_BACKUP_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${PCC_BACKUP_RETENTION_DAYS:-14}"
DATABASE_NAME="${PGDATABASE:-personal_control_center}"
R2_ENABLED="${PCC_R2_ENABLED:-0}"

validate_non_negative_integer() {
  value="$1"
  name="$2"
  case "$value" in
    ''|*[!0-9]*)
      echo "$name must be a non-negative integer." >&2
      exit 1
      ;;
  esac
}

case "$R2_ENABLED" in
  0|1) ;;
  *)
    echo "PCC_R2_ENABLED must be 0 or 1." >&2
    exit 1
    ;;
esac

validate_non_negative_integer "$INTERVAL_HOURS" "PCC_BACKUP_INTERVAL_HOURS"
validate_non_negative_integer "$RETENTION_DAYS" "PCC_BACKUP_RETENTION_DAYS"

create_backup() {
  mkdir -p "$BACKUP_DIR"
  if [ ! -d "$UPLOAD_DIR" ]; then
    echo "Upload directory does not exist: $UPLOAD_DIR" >&2
    exit 1
  fi
  umask 077

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  database_path="$BACKUP_DIR/personal-control-center-$timestamp.dump"
  database_temporary="$database_path.tmp"
  uploads_path="$BACKUP_DIR/personal-control-center-$timestamp.uploads.tar.gz"
  uploads_temporary="$uploads_path.tmp"

  echo "Creating PostgreSQL backup at $database_path"
  rm -f "$database_temporary" "$uploads_temporary"
  pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="$database_temporary" \
    "$DATABASE_NAME"

  pg_restore --list "$database_temporary" >/dev/null

  echo "Creating upload backup at $uploads_path"
  tar -czf "$uploads_temporary" -C "$UPLOAD_DIR" .
  tar -tzf "$uploads_temporary" >/dev/null

  mv "$database_temporary" "$database_path"
  mv "$uploads_temporary" "$uploads_path"

  if [ "$R2_ENABLED" = "1" ]; then
    echo "Starting encrypted off-site backup."
    if ! /usr/local/bin/pcc-offsite backup "$database_path"; then
      echo "The local backup succeeded, but the R2 backup failed. Check with: sh scripts/manage-offsite-backup.sh status" >&2
    fi
  fi

  find "$BACKUP_DIR" \
    -type f \
    \( -name 'personal-control-center-*.dump' -o -name 'personal-control-center-*.uploads.tar.gz' \) \
    -mtime "+$RETENTION_DAYS" \
    -delete

  echo "Local backup completed: $database_path and $uploads_path"
}

if [ "${1:-}" = "--once" ]; then
  create_backup
  exit 0
fi

while true; do
  create_backup

  if [ "$INTERVAL_HOURS" -eq 0 ]; then
    echo "PCC_BACKUP_INTERVAL_HOURS=0 is only valid with --once." >&2
    exit 1
  fi

  sleep "$((INTERVAL_HOURS * 60 * 60))"
done
