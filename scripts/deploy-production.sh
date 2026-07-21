#!/bin/sh
set -eu

DEPLOY_REF="${1:-main}"
BACKUP_DIR="${PCC_HOST_BACKUP_DIR:-data/backups}"
HEALTH_URL="${PCC_HEALTH_URL:-http://127.0.0.1:3000/api/health}"

if [ ! -f compose.yaml ] || [ ! -d .git ]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo ".env is required before deployment." >&2
  exit 1
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Tracked production files contain local changes. Commit or discard them before deploying." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR" data/deployments data/uploads
previous_commit="$(git rev-parse HEAD)"
printf '%s\n' "$previous_commit" > data/deployments/previous-commit

# Ensure PostgreSQL is available before taking the pre-deployment backup.
docker compose up -d postgres
for attempt in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U pcc -d personal_control_center >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "PostgreSQL did not become ready." >&2
    exit 1
  fi
  sleep 2
done

backup_path="$BACKUP_DIR/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
uploads_backup_path="${backup_path%.dump}.uploads.tar.gz"
echo "Creating pre-deployment backups: $backup_path and $uploads_backup_path"
docker compose exec -T postgres \
  pg_dump -U pcc -d personal_control_center -Fc --no-owner --no-acl \
  > "$backup_path"
tar -czf "$uploads_backup_path" -C data/uploads .

if [ ! -s "$backup_path" ] || [ ! -s "$uploads_backup_path" ]; then
  echo "A pre-deployment backup is empty; deployment stopped." >&2
  exit 1
fi

# Validate both backups before changing application code.
docker compose exec -T postgres pg_restore --list < "$backup_path" >/dev/null
tar -tzf "$uploads_backup_path" >/dev/null

echo "Deploying origin/$DEPLOY_REF (previous commit: $previous_commit)"
git fetch origin "$DEPLOY_REF"
git checkout "$DEPLOY_REF"
git pull --ff-only origin "$DEPLOY_REF"

profile_args=""
if grep -Eq '^PCC_FUNNEL_ENABLED=1$' .env; then
  profile_args="--profile funnel"
fi

docker compose $profile_args config --quiet
docker compose $profile_args up -d --build --remove-orphans

# Tailscale shares the app container's network namespace. Recreate it after any
# app replacement so it attaches to the current app container while retaining
# its identity and Funnel configuration in the persistent state volume.
if [ -n "$profile_args" ]; then
  docker compose --profile funnel up -d --force-recreate tailscale
fi

for attempt in $(seq 1 60); do
  if curl --fail --silent "$HEALTH_URL" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    echo "Deployment failed its application health check." >&2
    echo "The previous commit is recorded in data/deployments/previous-commit." >&2
    echo "The database backup is $backup_path." >&2
    echo "The upload backup is $uploads_backup_path." >&2
    exit 1
  fi
  sleep 2
done

if [ -n "$profile_args" ]; then
  for attempt in $(seq 1 30); do
    if docker compose --profile funnel exec -T tailscale tailscale status --json 2>/dev/null \
      | grep -Eq '"BackendState"[[:space:]]*:[[:space:]]*"Running"'; then
      break
    fi
    if [ "$attempt" -eq 30 ]; then
      echo "The application is healthy, but Tailscale did not reconnect." >&2
      docker compose --profile funnel logs --tail=100 tailscale >&2 || true
      exit 1
    fi
    sleep 2
  done
fi

echo "Deployment health checks passed."
docker compose $profile_args ps
