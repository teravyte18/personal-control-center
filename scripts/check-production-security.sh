#!/bin/sh
set -eu

if [ ! -f compose.yaml ] || [ ! -f .env ]; then
  echo "Run this script from the configured production repository root." >&2
  exit 1
fi

if ! grep -Eq '^PCC_FUNNEL_ENABLED=1$' .env; then
  echo "FAIL: PCC_FUNNEL_ENABLED must be 1 for the public production deployment." >&2
  exit 1
fi

permissions="$(stat -c '%a' .env)"
case "$permissions" in
  400|600)
    echo "Environment file permissions: OK ($permissions)"
    ;;
  *)
    echo "FAIL: .env permissions are $permissions; expected 600 or 400." >&2
    exit 1
    ;;
esac

docker compose --profile funnel exec -T app sh -eu -c '
case "${PCC_PUBLIC_URL:-}" in
  https://*.ts.net)
    echo "Public HTTPS URL: OK"
    ;;
  *)
    echo "FAIL: PCC_PUBLIC_URL is not the Tailscale Funnel HTTPS URL." >&2
    exit 1
    ;;
esac

[ "${PCC_COOKIE_SECURE:-}" = "1" ] || {
  echo "FAIL: PCC_COOKIE_SECURE must be 1." >&2
  exit 1
}
echo "Secure session cookies: OK"

[ "${PCC_ALLOW_INSECURE_USER_HEADER:-0}" = "0" ] || {
  echo "FAIL: PCC_ALLOW_INSECURE_USER_HEADER must be 0." >&2
  exit 1
}
echo "Insecure identity override: disabled"

[ -z "${PCC_OWNER_BOOTSTRAP_PASSWORD:-}" ] || {
  echo "FAIL: PCC_OWNER_BOOTSTRAP_PASSWORD must be empty after first login." >&2
  exit 1
}
echo "Owner bootstrap password: removed"
'

docker compose --profile funnel exec -T tailscale sh -eu -c '
[ -z "${TS_AUTHKEY:-}" ] || {
  echo "FAIL: the Tailscale registration key is still injected." >&2
  exit 1
}
echo "Tailscale registration key: removed"

tailscale status --json >/dev/null
tailscale funnel status >/dev/null
echo "Tailscale node and Funnel route: OK"
'

curl --fail --silent http://127.0.0.1:3000/api/health >/dev/null
echo "Local application health: OK"

public_url="$(grep '^PCC_PUBLIC_URL=' .env | cut -d= -f2-)"
curl --fail --silent "$public_url/api/health" >/dev/null
echo "Public HTTPS health: OK"

echo "Production security configuration passed."
