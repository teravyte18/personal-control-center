#!/bin/sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
  echo "Do not run this script as root or through sudo. Root execution can discard COMPOSE_PROJECT_NAME and target the wrong Compose project." >&2
  exit 1
fi

if [ ! -f compose.yaml ] || [ ! -f .env ]; then
  echo "Run this script from the configured repository root." >&2
  exit 1
fi

# Create bind-mount sources as the invoking user before Docker can create them
# as root. This keeps restic cache, restore staging, uploads, and status files
# writable in clean checkouts and isolated restore rehearsals.
mkdir -p data/backups data/uploads data/offsite-restore
for directory in data/backups data/uploads data/offsite-restore; do
  if [ ! -w "$directory" ]; then
    echo "Directory is not writable by $(id -un): $directory" >&2
    echo "Fix its ownership before retrying; do not rerun this command with sudo." >&2
    exit 1
  fi
done

command="${1:-status}"

case "$command" in
  init|status|check|prune)
    docker compose run --rm --no-deps \
      --entrypoint /bin/sh \
      backup /usr/local/bin/pcc-offsite "$command"
    ;;
  backup-now)
    docker compose run --rm backup --once
    ;;
  restore-latest)
    sh scripts/restore-offsite.sh
    ;;
  *)
    echo "Usage: sh scripts/manage-offsite-backup.sh {init|backup-now|status|check|prune|restore-latest}" >&2
    exit 1
    ;;
esac
