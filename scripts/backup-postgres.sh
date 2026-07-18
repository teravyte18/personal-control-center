#!/bin/sh
set -eu

BACKUP_DIR="${PCC_BACKUP_DIR:-/backups}"
INTERVAL_HOURS="${PCC_BACKUP_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${PCC_BACKUP_RETENTION_DAYS:-14}"
DATABASE_NAME="${PGDATABASE:-personal_control_center}"

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

validate_non_negative_integer "$INTERVAL_HOURS" "PCC_BACKUP_INTERVAL_HOURS"
validate_non_negative_integer "$RETENTION_DAYS" "PCC_BACKUP_RETENTION_DAYS"

create_backup() {
  mkdir -p "$BACKUP_DIR"
  umask 077

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  final_path="$BACKUP_DIR/personal-control-center-$timestamp.dump"
  temporary_path="$final_path.tmp"

  echo "Creating PostgreSQL backup at $final_path"
  rm -f "$temporary_path"
  pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --file="$temporary_path" \
    "$DATABASE_NAME"

  pg_restore --list "$temporary_path" >/dev/null
  mv "$temporary_path" "$final_path"

  find "$BACKUP_DIR" \
    -type f \
    -name 'personal-control-center-*.dump' \
    -mtime "+$RETENTION_DAYS" \
    -delete

  echo "Backup completed: $final_path"
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
