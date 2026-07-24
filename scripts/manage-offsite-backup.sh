#!/bin/sh
set -eu

if [ ! -f compose.yaml ] || [ ! -f .env ]; then
  echo "Run this script from the configured production repository root." >&2
  exit 1
fi

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
