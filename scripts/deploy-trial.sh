#!/bin/sh
set -eu

# Run from a clean branch checkout on the existing production host.
# This uses the existing database/session/upload boundaries and starts only a
# second application process. Main, migrations, workers and backups stay live.
PCC_TRIAL_SOURCE_ROOT="$(pwd -P)"
PCC_TRIAL_LIVE_ROOT="${PCC_TRIAL_LIVE_ROOT:-/opt/personal-control-center}"
PCC_TRIAL_PUBLIC_URL="${PCC_TRIAL_PUBLIC_URL:?Set the HTTPS trial URL including port 8443}"
export PCC_TRIAL_SOURCE_ROOT PCC_TRIAL_LIVE_ROOT PCC_TRIAL_PUBLIC_URL

if [ ! -f compose.trial.yaml ] || [ ! -f "$PCC_TRIAL_LIVE_ROOT/.env" ]; then
  echo "Run from the trial checkout and provide the existing live deployment root." >&2
  exit 1
fi
if [ "$PCC_TRIAL_SOURCE_ROOT" = "$PCC_TRIAL_LIVE_ROOT" ]; then
  echo "The trial checkout must be separate from the live checkout." >&2
  exit 1
fi
case "$PCC_TRIAL_PUBLIC_URL" in
  https://*.ts.net:8443) ;;
  *) echo "Use the existing Tailscale HTTPS hostname on port 8443." >&2; exit 1 ;;
esac
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Commit tracked trial changes before deployment." >&2
  exit 1
fi
if [ "$(git branch --show-current)" = main ]; then
  echo "A trial must not deploy main." >&2
  exit 1
fi
git diff --exit-code origin/main -- db src/domain src/server src/providers src/app/api src/proxy.ts >/dev/null || {
  echo "This UI trial does not permit persistence, authentication or schema changes." >&2
  exit 1
}

live_compose() {
  docker compose --project-directory "$PCC_TRIAL_LIVE_ROOT" --env-file "$PCC_TRIAL_LIVE_ROOT/.env" -f "$PCC_TRIAL_LIVE_ROOT/compose.yaml" --profile funnel "$@"
}
trial_compose() {
  docker compose -p personal-control-center --project-directory "$PCC_TRIAL_LIVE_ROOT" --env-file "$PCC_TRIAL_LIVE_ROOT/.env" -f "$PCC_TRIAL_SOURCE_ROOT/compose.yaml" -f "$PCC_TRIAL_SOURCE_ROOT/compose.trial.yaml" "$@"
}

live_before="$(git -C "$PCC_TRIAL_LIVE_ROOT" rev-parse HEAD)"
live_compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
trial_compose config --quiet
trial_compose build app-trial
trial_compose up -d --no-deps app-trial
for attempt in $(seq 1 60); do
  if trial_compose exec -T app-trial wget -qO- http://127.0.0.1:3002/api/health >/dev/null; then break; fi
  if [ "$attempt" -eq 60 ]; then echo "Trial health check failed; main is unchanged." >&2; exit 1; fi
  sleep 2
done
live_compose exec -T tailscale tailscale funnel --bg --https=8443 http://127.0.0.1:3002
test "$(git -C "$PCC_TRIAL_LIVE_ROOT" rev-parse HEAD)" = "$live_before"
live_compose exec -T app wget -qO- http://127.0.0.1:3000/api/health >/dev/null
echo "Trial deployed at $PCC_TRIAL_PUBLIC_URL; main remains at $live_before."
echo "Rollback: disable only Funnel port 8443, then stop only app-trial."
