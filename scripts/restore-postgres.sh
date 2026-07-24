#!/bin/sh
set -eu

DUMP_PATH="${1:-}"
DATABASE_NAME="personal_control_center"
DATABASE_USER="pcc"

if [ "$(id -u)" -eq 0 ]; then
  echo "Do not run this restore as root or through sudo." >&2
  echo "Root execution can discard COMPOSE_PROJECT_NAME and restore into the wrong Compose project." >&2
  echo "Fix host-directory ownership, then rerun as the normal deployment user." >&2
  exit 1
fi

if [ -z "$DUMP_PATH" ] || [ ! -f "$DUMP_PATH" ]; then
  echo "Usage: sh scripts/restore-postgres.sh path/to/backup.dump" >&2
  exit 1
fi

if [ ! -f compose.yaml ] || [ ! -f .env ]; then
  echo "Run this script from the configured repository root." >&2
  exit 1
fi

# Create the uploads bind-mount source as the invoking user before Docker can
# create it as root in a clean checkout.
mkdir -p data/uploads
if [ ! -w data/uploads ]; then
  echo "Upload directory is not writable by $(id -un): data/uploads" >&2
  echo "Fix its ownership before retrying; do not rerun this command with sudo." >&2
  exit 1
fi

case "$DUMP_PATH" in
  *.dump) UPLOAD_ARCHIVE="${DUMP_PATH%.dump}.uploads.tar.gz" ;;
  *) UPLOAD_ARCHIVE="" ;;
esac

if [ -n "$UPLOAD_ARCHIVE" ] && [ -f "$UPLOAD_ARCHIVE" ]; then
  tar -tzf "$UPLOAD_ARCHIVE" >/dev/null
  if tar -tzf "$UPLOAD_ARCHIVE" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
    echo "The upload archive contains an unsafe path." >&2
    exit 1
  fi
  restore_description="the database and uploads from $DUMP_PATH"
else
  UPLOAD_ARCHIVE=""
  restore_description="the database from $DUMP_PATH (no paired upload archive was found)"
fi

compose_project="${COMPOSE_PROJECT_NAME:-}"
if [ -z "$compose_project" ]; then
  compose_project="$(sed -n 's/^name:[[:space:]]*//p' compose.yaml | head -n 1)"
fi
compose_project="${compose_project:-$(basename "$(pwd -P)")}"

echo "Restore repository: $(pwd -P)"
echo "Restore Compose project: $compose_project"
printf 'This replaces %s. Type RESTORE to continue: ' "$restore_description"
read -r confirmation
if [ "$confirmation" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

# Verify the dump before stopping the application.
docker compose run --rm --no-deps \
  -v "$(cd "$(dirname "$DUMP_PATH")" && pwd):/restore:ro" \
  --entrypoint pg_restore \
  backup \
  --list "/restore/$(basename "$DUMP_PATH")" >/dev/null

docker compose stop app backup || true
docker compose --profile funnel stop tailscale || true
docker compose up -d postgres

for attempt in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U "$DATABASE_USER" -d postgres >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "PostgreSQL did not become ready." >&2
    exit 1
  fi
  sleep 2
done

docker compose exec -T postgres psql -U "$DATABASE_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
DROP DATABASE IF EXISTS $DATABASE_NAME WITH (FORCE);
CREATE DATABASE $DATABASE_NAME OWNER $DATABASE_USER;
SQL

docker compose exec -T postgres \
  pg_restore -U "$DATABASE_USER" -d "$DATABASE_NAME" --no-owner --no-acl \
  < "$DUMP_PATH"

if [ -n "$UPLOAD_ARCHIVE" ]; then
  find data/uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -xzf "$UPLOAD_ARCHIVE" -C data/uploads
fi

# Apply any migrations newer than the restored backup, then restart services.
docker compose run --rm migrate

profile_args=""
if grep -Eq '^PCC_FUNNEL_ENABLED=1$' .env; then
  profile_args="--profile funnel"
fi

docker compose $profile_args up -d --remove-orphans

# Tailscale shares the app network namespace, so a fresh Tailscale container
# must attach after the application is restarted or recreated.
if [ -n "$profile_args" ]; then
  docker compose --profile funnel up -d --force-recreate tailscale
fi

echo "Restore completed. Validate the health endpoint, photo access, and sign-in before resuming normal use."
