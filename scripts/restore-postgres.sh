#!/bin/sh
set -eu

DUMP_PATH="${1:-}"
DATABASE_NAME="personal_control_center"
DATABASE_USER="pcc"

if [ -z "$DUMP_PATH" ] || [ ! -f "$DUMP_PATH" ]; then
  echo "Usage: sh scripts/restore-postgres.sh path/to/backup.dump" >&2
  exit 1
fi

if [ ! -f compose.yaml ] || [ ! -f .env ]; then
  echo "Run this script from the configured production repository root." >&2
  exit 1
fi

printf 'This replaces the entire PostgreSQL database with %s. Type RESTORE to continue: ' "$DUMP_PATH"
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
docker compose --profile tunnel stop cloudflared || true
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

# Apply any migrations newer than the restored backup, then restart services.
docker compose run --rm migrate

profile_args=""
if grep -Eq '^CLOUDFLARE_TUNNEL_TOKEN=.+$' .env; then
  profile_args="--profile tunnel"
fi

docker compose $profile_args up -d --remove-orphans

echo "Restore completed. Validate the health endpoint and sign in before resuming normal use."
