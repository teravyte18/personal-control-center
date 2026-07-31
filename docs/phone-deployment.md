# Phone production deployment with Tailscale Funnel

This is the current production procedure for exposing the authenticated application through a stable Tailscale HTTPS hostname without buying a domain, opening inbound router ports, or publishing PostgreSQL.

## Topology

```text
Phone or desktop browser
        │ public HTTPS
        ▼
personal-control-center.<tailnet>.ts.net
        │ Tailscale Funnel
        ▼
Tailscale container ──► app on 127.0.0.1:3000
                              ├── PostgreSQL
                              └── private upload tree
```

The `tailscale` container shares the application container's network namespace. Funnel can proxy localhost while the host publishes the app only on `127.0.0.1:3000`. PostgreSQL remains private inside Compose.

Never force-recreate only `app` while Funnel is enabled. Recreate both network-sharing services:

```bash
docker compose --profile funnel up -d --force-recreate app tailscale
```

The deployment and restore scripts handle this automatically.

## One-time host preparation

```bash
git clone https://github.com/teravyte18/personal-control-center.git
cd personal-control-center
cp .env.example .env
mkdir -p data/backups data/uploads data/offsite-restore
id -u
id -g
```

Set at least:

```text
POSTGRES_PASSWORD=<long random value>
PCC_DEFAULT_USER_EMAIL=<owner email>
PCC_OWNER_BOOTSTRAP_PASSWORD=<temporary password of at least 12 characters>
PCC_PUBLIC_URL=http://localhost:3000
PCC_COOKIE_SECURE=0
PCC_ALLOW_INSECURE_USER_HEADER=0
PCC_FUNNEL_ENABLED=1
TAILSCALE_HOSTNAME=personal-control-center
TAILSCALE_AUTH_KEY=<one-off non-ephemeral key>
PCC_HOST_UID=<id -u result>
PCC_HOST_GID=<id -g result>
```

Do not commit `.env` or the Tailscale key.

## First production start

Create a one-off non-ephemeral auth key in Tailscale, then:

```bash
git switch main
git pull --ff-only
docker compose --profile funnel up -d --build

docker compose --profile funnel ps
docker compose logs --tail=100 migrate
docker compose logs --tail=100 app
docker compose logs --tail=100 backup
docker compose logs --tail=100 tailscale
```

Confirm the node and enable Funnel:

```bash
docker compose --profile funnel exec -T tailscale tailscale status

docker compose --profile funnel exec tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000

docker compose --profile funnel exec -T tailscale tailscale funnel status
```

Approve the browser prompt if required. Update `.env` with the exact URL:

```text
PCC_PUBLIC_URL=https://personal-control-center.example-tailnet.ts.net
PCC_COOKIE_SECURE=1
TAILSCALE_AUTH_KEY=
```

Apply the final environment and reapply the route:

```bash
docker compose --profile funnel up -d --force-recreate app tailscale

docker compose --profile funnel exec -T tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000
```

After the owner signs in successfully once, empty `PCC_OWNER_BOOTSTRAP_PASSWORD` and recreate `app` and `tailscale` together again.

## Production validation

```bash
docker compose --profile funnel ps
curl --fail http://127.0.0.1:3000/api/health
curl --fail --head https://personal-control-center.example-tailnet.ts.net/login
ls -lh data/backups
sh scripts/check-production-security.sh
```

The security audit verifies private environment permissions, Funnel HTTPS, Secure cookies, disabled test identity overrides, cleared temporary keys, active Funnel state, and local/public health.

## Phone validation

1. Disable Wi-Fi and open the HTTPS URL over mobile data.
2. Sign in and confirm representative Projects, Tasks, Notes, Reviews, and Library records.
3. Create a neutral Capture item and confirm it appears on another browser for the same account.
4. Edit or complete a record on one device and confirm the newer server revision on the other.
5. Install the PWA, launch it, close it, and reopen it.
6. Change theme and mobile quick-access positions and confirm these preferences remain local to that browser/device.
7. Open Library twice and confirm covers reuse the private cached display response after the first request.
8. Remove temporary validation data.

Funnel is public internet ingress: visitors do not need Tailscale installed, so application authentication remains the personal-data boundary.

## Offline Quick Capture preparation

The complete application is not offline-capable. Only new Quick Capture items have a durable device-local fallback.

After service-worker changes:

1. Open the installed PWA online and sign in.
2. Keep it open for several seconds.
3. Reload or close and reopen once online.
4. Test a fully offline cold start.

The PWA should open the dedicated Capture-only fallback rather than a browser network error. Pending captures may be lost if site data is cleared or the PWA is uninstalled. See `offline-capture.md` for the full battery and outage recovery commands.

## Google Calendar

Calendar is optional and configured after public HTTPS is stable. Register this exact OAuth redirect:

```text
<PCC_PUBLIC_URL>/api/integrations/google-calendar/callback
```

Keep the OAuth secret and stable token-encryption key in `.env`. See `google-calendar.md`.

## Backups

The backup service creates a validated database/upload pair on startup and every 24 hours by default:

```text
data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.uploads.tar.gz
```

The upload archive contains review photos and original Library covers.

Create another pair:

```bash
docker compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
```

Production also uses encrypted Cloudflare R2/restic snapshots. See `offsite-backups.md`; local Pi copies are not a substitute for off-site recovery.

## Production updates

After CI passes and a pull request is merged into `main`:

```bash
cd /opt/personal-control-center
sh scripts/deploy-production.sh main
```

The script records the previous commit, creates and validates pre-deployment backups, fast-forwards `main`, runs migrations, preserves volumes, rebuilds the application, reconnects Funnel, and waits for health checks.

Never run `docker compose down --volumes` during a normal update or rollback.

## Useful Funnel commands

```bash
# Show route
docker compose --profile funnel exec -T tailscale tailscale funnel status

# Reattach after manually replacing app
docker compose --profile funnel up -d --force-recreate tailscale

# Reapply route
docker compose --profile funnel exec -T tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000

# Disable Funnel
docker compose --profile funnel exec -T tailscale tailscale funnel reset
```

## Restore

Local restoration replaces the database and, when the paired archive exists, the upload tree:

```bash
sh scripts/restore-postgres.sh data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

For R2, stage and validate the latest snapshot first:

```bash
sh scripts/manage-offsite-backup.sh restore-latest
```

After restoration, verify health, sign-in, account isolation, representative projects/actions, Notes ordering, Review history/photos, Library metadata/covers, Accomplishments, Archive, Calendar connection state, and backup health.
