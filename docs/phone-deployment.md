# Phone production deployment with Tailscale Funnel

This procedure exposes the authenticated application through a stable Tailscale HTTPS hostname without buying a domain, opening inbound firewall ports, or exposing PostgreSQL.

## Resulting topology

```text
Phone or desktop browser
        │
        │ public HTTPS
        ▼
personal-control-center.<tailnet>.ts.net
        │
        │ Tailscale Funnel
        ▼
Tailscale container ──► app on 127.0.0.1:3000
                              │
                              ▼
                          PostgreSQL
```

The `tailscale` container shares the application's network namespace, so Funnel can proxy the supported `127.0.0.1` target while the host application port remains bound to `127.0.0.1:3000` for SSH-tunnel maintenance. PostgreSQL remains private inside Compose.

## One-time Tailscale setup

1. Create or sign in to a Tailscale account.
2. In the admin console, create a one-off, non-ephemeral auth key.
3. Do not post the key in chat or commit it. Enter it only in the production server's `.env` file.
4. Funnel requires MagicDNS, HTTPS certificates, and Funnel permission. The first `tailscale funnel` command provides a browser approval link when any requirement is missing.

The Compose service uses the official `tailscale/tailscale:stable` image, persists its device identity in the `tailscale_state` Docker volume, and starts only with the optional `funnel` profile.

## First Funnel deployment

Before pulling changes, create a manual database dump using the currently running stack:

```bash
cd /opt/personal-control-center
mkdir -p data/backups
docker compose exec -T postgres \
  pg_dump -U pcc -d personal_control_center -Fc --no-owner --no-acl \
  > data/backups/pre-funnel-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Pull the branch:

```bash
git fetch origin
git switch agent/slice-3-durable-deployment
git pull --ff-only
mkdir -p data/backups data/uploads
```

Record the production user's numeric IDs:

```bash
id -u
id -g
```

Edit `.env`, preserving the existing database password and owner email. For the first Tailscale registration, use:

```text
PCC_FUNNEL_ENABLED=1
TAILSCALE_HOSTNAME=personal-control-center
TAILSCALE_AUTH_KEY=paste-the-one-off-non-ephemeral-key-here
PCC_HOST_UID=1000
PCC_HOST_GID=1000
PCC_COOKIE_SECURE=0
PCC_ALLOW_INSECURE_USER_HEADER=0
```

Replace the UID and GID with the values returned by `id -u` and `id -g` when different.

Start the stack and register the Tailscale node:

```bash
docker compose --profile funnel up -d --build

docker compose --profile funnel ps
docker compose logs --tail=100 tailscale
```

Confirm the node is connected:

```bash
docker compose --profile funnel exec -T tailscale tailscale status
```

Enable Funnel for the app:

```bash
docker compose --profile funnel exec tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000
```

On first use, the command may print an approval URL. Open that URL in a browser, approve Funnel, and run the command again. Funnel supports public TLS only and automatically provisions the certificate.

Display the final public URL:

```bash
docker compose --profile funnel exec -T tailscale tailscale funnel status
```

It should resemble:

```text
https://personal-control-center.example-tailnet.ts.net
```

Update `.env` with that exact URL and secure cookies:

```text
PCC_PUBLIC_URL=https://personal-control-center.example-tailnet.ts.net
PCC_COOKIE_SECURE=1
```

The Tailscale identity is now persisted, so remove the temporary auth key from `.env`:

```text
TAILSCALE_AUTH_KEY=
```

Apply the final environment safely:

```bash
docker compose --profile funnel up -d --force-recreate app tailscale

docker compose --profile funnel exec -T tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000
```

Validate:

```bash
docker compose --profile funnel ps
docker compose logs --tail=100 migrate
docker compose logs --tail=100 app
docker compose logs --tail=100 backup
docker compose logs --tail=100 tailscale
curl --fail http://127.0.0.1:3000/api/health
curl --fail --head https://personal-control-center.example-tailnet.ts.net/login
ls -lh data/backups
```

## Phone validation

1. Disable Wi-Fi and open the HTTPS Funnel URL over mobile data.
2. Sign in with the owner account.
3. Confirm the existing projects and cards are present.
4. Create a neutral temporary capture.
5. Open the same account on desktop and confirm the capture appears.
6. Edit or complete it on one device and confirm the other device refreshes.
7. In Chrome on Android, select **Install app** or **Add to Home screen**.
8. Launch it from the home screen, close it, reopen it, and confirm the session remains active.
9. Repeat a basic read/write test over Wi-Fi.
10. Remove the temporary validation item.

Funnel is public internet ingress: visitors do not need Tailscale installed, and the application's own login protects personal data. Offline synchronization is not included; the installed PWA still requires network access.

## Automatic backups

The `backup` service creates a validated custom-format PostgreSQL dump immediately after startup and every 24 hours by default:

```text
data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

Create an additional dump:

```bash
docker compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
```

An occasional copy should be moved off the DigitalOcean host.

## Future production updates

After CI passes and an approved change is merged to `main`:

```bash
cd /opt/personal-control-center
sh scripts/deploy-production.sh main
```

When `PCC_FUNNEL_ENABLED=1`, the deployment script keeps the Funnel profile running. The Tailscale device identity and Funnel configuration persist in the `tailscale_state` volume.

Never run `docker compose down --volumes` during a normal update.

## Useful Funnel commands

```bash
# Show the public route
docker compose --profile funnel exec -T tailscale tailscale funnel status

# Reapply the public proxy
docker compose --profile funnel exec -T tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000

# Disable all Funnel configuration
docker compose --profile funnel exec -T tailscale tailscale funnel reset
```

## Restore procedure

Restoration replaces the entire database and requires explicit confirmation:

```bash
sh scripts/restore-postgres.sh data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

After restoration, verify the health endpoint, sign in, and inspect representative projects, thoughts, reviews, accomplishments, and archived records before resuming normal use.
