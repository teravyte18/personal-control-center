#!/bin/sh
set -eu

BACKUP_DIR="${PCC_BACKUP_DIR:-/backups}"
UPLOAD_DIR="${PCC_UPLOAD_DIR:-/uploads}"
SOURCE_ROOT="${PCC_SOURCE_ROOT:-/source}"
STATUS_FILE="${PCC_OFFSITE_STATUS_FILE:-$BACKUP_DIR/offsite-status}"
PRUNE_MARKER="${PCC_OFFSITE_PRUNE_MARKER:-$BACKUP_DIR/offsite-prune-week}"
RESTORE_ROOT="${PCC_OFFSITE_RESTORE_ROOT:-/restore}"
ENABLED="${PCC_R2_ENABLED:-0}"
REPOSITORY="${PCC_R2_REPOSITORY:-}"
REGION="${PCC_R2_REGION:-auto}"
ACCESS_KEY_FILE="${PCC_R2_ACCESS_KEY_ID_FILE:-/run/secrets/r2-access-key-id}"
SECRET_KEY_FILE="${PCC_R2_SECRET_ACCESS_KEY_FILE:-/run/secrets/r2-secret-access-key}"
PASSWORD_FILE="${PCC_RESTIC_PASSWORD_FILE:-/run/secrets/restic-password}"
RESTIC_HOST="${PCC_RESTIC_HOSTNAME:-personal-control-center-pi}"
RESTIC_TAG="${PCC_RESTIC_TAG:-pcc-nightly}"
MAX_BACKUP_AGE_HOURS="${PCC_R2_MAX_BACKUP_AGE_HOURS:-36}"

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

validate_enabled() {
  case "$ENABLED" in
    0|1) ;;
    *)
      echo "PCC_R2_ENABLED must be 0 or 1." >&2
      exit 1
      ;;
  esac
}

read_status_field() {
  field="$1"
  if [ ! -f "$STATUS_FILE" ]; then
    return 0
  fi
  sed -n "s/^${field}=//p" "$STATUS_FILE" | tail -n 1
}

write_status() {
  result="$1"
  attempt_epoch="$2"
  success_epoch="$3"
  duration_seconds="$4"
  snapshot_id="$5"
  temporary="${STATUS_FILE}.tmp"

  mkdir -p "$(dirname "$STATUS_FILE")"
  umask 077
  cat > "$temporary" <<EOF
result=$result
attempt_epoch=$attempt_epoch
success_epoch=$success_epoch
duration_seconds=$duration_seconds
snapshot_id=$snapshot_id
EOF
  mv "$temporary" "$STATUS_FILE"
}

require_file() {
  path="$1"
  label="$2"
  if [ ! -r "$path" ]; then
    echo "$label is missing or unreadable: $path" >&2
    exit 1
  fi
}

configure_restic() {
  if [ -z "$REPOSITORY" ]; then
    echo "PCC_R2_REPOSITORY is required when R2 backups are enabled." >&2
    exit 1
  fi

  require_file "$ACCESS_KEY_FILE" "R2 access-key file"
  require_file "$SECRET_KEY_FILE" "R2 secret-key file"
  require_file "$PASSWORD_FILE" "restic password file"

  AWS_ACCESS_KEY_ID="$(cat "$ACCESS_KEY_FILE")"
  AWS_SECRET_ACCESS_KEY="$(cat "$SECRET_KEY_FILE")"
  export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
  export AWS_DEFAULT_REGION="$REGION"
  export RESTIC_REPOSITORY="$REPOSITORY"
  export RESTIC_PASSWORD_FILE="$PASSWORD_FILE"
  export RESTIC_CACHE_DIR="${PCC_RESTIC_CACHE_DIR:-$BACKUP_DIR/.restic-cache}"
}

restic_command() {
  restic -o s3.bucket-lookup=path "$@"
}

run_retention() {
  restic_command forget \
    --host "$RESTIC_HOST" \
    --tag "$RESTIC_TAG" \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 6

  current_week="$(date -u +%Y-%U)"
  previous_week=""
  if [ -f "$PRUNE_MARKER" ]; then
    previous_week="$(cat "$PRUNE_MARKER")"
  fi

  if [ "$current_week" != "$previous_week" ]; then
    echo "Running weekly restic prune."
    restic_command prune
    umask 077
    printf '%s\n' "$current_week" > "$PRUNE_MARKER"
  fi
}

backup_snapshot() {
  database_path="${1:-}"
  if [ -z "$database_path" ] || [ ! -f "$database_path" ]; then
    echo "Usage: pcc-offsite backup /backups/personal-control-center-*.dump" >&2
    exit 1
  fi
  if [ ! -d "$UPLOAD_DIR" ]; then
    echo "Upload directory does not exist: $UPLOAD_DIR" >&2
    exit 1
  fi

  configure_restic

  started_epoch="$(date +%s)"
  output_file="$BACKUP_DIR/.offsite-backup-output.$$"
  previous_success="$(read_status_field success_epoch)"
  previous_snapshot="$(read_status_field snapshot_id)"
  previous_success="${previous_success:-0}"
  previous_snapshot="${previous_snapshot:-}"

  set -- "$database_path" "$UPLOAD_DIR"
  for path in \
    "$SOURCE_ROOT/compose.yaml" \
    "$SOURCE_ROOT/.env" \
    "$SOURCE_ROOT/scripts/restore-postgres.sh" \
    "$SOURCE_ROOT/scripts/restore-offsite.sh" \
    "$SOURCE_ROOT/docs/offsite-backups.md"
  do
    if [ -f "$path" ]; then
      set -- "$@" "$path"
    fi
  done

  echo "Creating encrypted R2 snapshot from the validated database dump, raw uploads, and recovery configuration."
  if restic_command backup \
    --json \
    --host "$RESTIC_HOST" \
    --tag "$RESTIC_TAG" \
    "$@" >"$output_file" 2>&1
  then
    cat "$output_file"
    snapshot_id="$(jq -r 'select(.message_type == "summary") | .snapshot_id // empty' "$output_file" | tail -n 1)"
    if [ -z "$snapshot_id" ]; then
      echo "restic completed without returning a snapshot ID." >&2
      ended_epoch="$(date +%s)"
      write_status failed "$ended_epoch" "$previous_success" "$((ended_epoch - started_epoch))" "$previous_snapshot"
      rm -f "$output_file"
      exit 1
    fi

    if ! run_retention; then
      ended_epoch="$(date +%s)"
      write_status failed "$ended_epoch" "$ended_epoch" "$((ended_epoch - started_epoch))" "$snapshot_id"
      rm -f "$output_file"
      echo "The snapshot was created, but retention or pruning failed." >&2
      exit 1
    fi

    ended_epoch="$(date +%s)"
    write_status success "$ended_epoch" "$ended_epoch" "$((ended_epoch - started_epoch))" "$snapshot_id"
    rm -f "$output_file"
    echo "Encrypted off-site snapshot completed: $snapshot_id"
    return 0
  else
    exit_code="$?"
    cat "$output_file" >&2
    ended_epoch="$(date +%s)"
    write_status failed "$ended_epoch" "$previous_success" "$((ended_epoch - started_epoch))" "$previous_snapshot"
    rm -f "$output_file"
    return "$exit_code"
  fi
}

show_status() {
  validate_enabled
  if [ "$ENABLED" = "0" ]; then
    echo "R2 off-site backups are disabled (PCC_R2_ENABLED=0)."
    return 0
  fi

  configure_restic

  if [ -f "$STATUS_FILE" ]; then
    echo "Local off-site backup status:"
    cat "$STATUS_FILE"
  else
    echo "No local off-site backup status has been recorded yet."
  fi

  echo
  echo "Latest matching R2 snapshot:"
  restic_command snapshots --latest 1 --host "$RESTIC_HOST" --tag "$RESTIC_TAG"

  echo
  echo "Raw data stored by the latest snapshot:"
  snapshot_id="$(read_status_field snapshot_id)"
  if [ -n "$snapshot_id" ]; then
    restic_command stats --mode raw-data "$snapshot_id"
  else
    restic_command stats --mode raw-data latest
  fi
}

health_check() {
  validate_enabled
  validate_non_negative_integer "$MAX_BACKUP_AGE_HOURS" "PCC_R2_MAX_BACKUP_AGE_HOURS"

  if [ "$ENABLED" = "0" ]; then
    exit 0
  fi

  if [ ! -f "$STATUS_FILE" ]; then
    echo "No successful R2 backup has been recorded." >&2
    exit 1
  fi

  result="$(read_status_field result)"
  success_epoch="$(read_status_field success_epoch)"
  success_epoch="${success_epoch:-0}"

  if [ "$result" != "success" ]; then
    echo "The latest R2 backup attempt failed." >&2
    exit 1
  fi

  now_epoch="$(date +%s)"
  maximum_age_seconds="$((MAX_BACKUP_AGE_HOURS * 60 * 60))"
  age_seconds="$((now_epoch - success_epoch))"
  if [ "$success_epoch" -le 0 ] || [ "$age_seconds" -gt "$maximum_age_seconds" ]; then
    echo "The latest successful R2 backup is stale." >&2
    exit 1
  fi
}

restore_latest() {
  target="${1:-$RESTORE_ROOT}"
  configure_restic

  if [ "$target" = "/" ] || [ -z "$target" ]; then
    echo "Refusing to restore into an unsafe target." >&2
    exit 1
  fi

  mkdir -p "$target"
  if find "$target" -mindepth 1 -maxdepth 1 | grep -q .; then
    echo "Restore target must be empty: $target" >&2
    exit 1
  fi

  restic_command restore latest \
    --host "$RESTIC_HOST" \
    --tag "$RESTIC_TAG" \
    --target "$target"
}

validate_enabled
validate_non_negative_integer "$MAX_BACKUP_AGE_HOURS" "PCC_R2_MAX_BACKUP_AGE_HOURS"

command="${1:-status}"
case "$command" in
  init)
    configure_restic
    restic_command init
    ;;
  backup)
    backup_snapshot "${2:-}"
    ;;
  status)
    show_status
    ;;
  health)
    health_check
    ;;
  check)
    configure_restic
    restic_command check
    ;;
  prune)
    configure_restic
    restic_command forget \
      --host "$RESTIC_HOST" \
      --tag "$RESTIC_TAG" \
      --keep-daily 7 \
      --keep-weekly 4 \
      --keep-monthly 6 \
      --prune
    ;;
  restore-latest)
    restore_latest "${2:-$RESTORE_ROOT}"
    ;;
  *)
    echo "Usage: pcc-offsite {init|backup DUMP|status|health|check|prune|restore-latest [TARGET]}" >&2
    exit 1
    ;;
esac
