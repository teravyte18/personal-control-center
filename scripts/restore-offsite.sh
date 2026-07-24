#!/bin/sh
set -eu

RESTORE_ROOT="data/offsite-restore"
RECOVERY_ROOT="$RESTORE_ROOT/recovery"

if [ ! -f compose.yaml ] || [ ! -f .env ]; then
  echo "Run this script from the configured production repository root." >&2
  exit 1
fi

rm -rf "$RESTORE_ROOT"
mkdir -p "$RESTORE_ROOT"

docker compose run --rm --no-deps \
  --entrypoint /bin/sh \
  backup /usr/local/bin/pcc-offsite restore-latest /restore

dump_path="$(find "$RESTORE_ROOT/backups" -maxdepth 1 -type f -name 'personal-control-center-*.dump' -size +0c | sort | tail -n 1)"
if [ -z "$dump_path" ]; then
  echo "The restored snapshot did not contain a PostgreSQL dump." >&2
  exit 1
fi

if [ ! -d "$RESTORE_ROOT/uploads" ]; then
  echo "The restored snapshot did not contain the raw upload directory." >&2
  exit 1
fi

mkdir -p "$RECOVERY_ROOT"
prepared_dump="$RECOVERY_ROOT/$(basename "$dump_path")"
prepared_uploads="${prepared_dump%.dump}.uploads.tar.gz"
cp "$dump_path" "$prepared_dump"
tar -czf "$prepared_uploads" -C "$RESTORE_ROOT/uploads" .
tar -tzf "$prepared_uploads" >/dev/null

docker compose run --rm --no-deps \
  -v "$(cd "$RECOVERY_ROOT" && pwd):/restore:ro" \
  --entrypoint pg_restore \
  backup \
  --list "/restore/$(basename "$prepared_dump")" >/dev/null

echo "The latest R2 snapshot was restored and validated locally."
echo "Prepared database dump: $prepared_dump"
echo "Prepared upload archive: $prepared_uploads"
echo
echo "To apply this backup to production, run:"
echo "  sh scripts/restore-postgres.sh $prepared_dump"
echo
echo "For the required clean-restore rehearsal, perform these steps on a temporary clean host instead of the production Raspberry Pi."
