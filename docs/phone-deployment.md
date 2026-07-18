# Phone production deployment

This procedure exposes the existing authenticated application through a stable HTTPS hostname while keeping PostgreSQL private and preserving the localhost SSH-tunnel path for maintenance.

## Resulting topology

```text
Phone or desktop browser
        │
        │ HTTPS
        ▼
Cloudflare hostname
        │
        │ outbound Cloudflare Tunnel connection
        ▼
cloudflared container ──► app:3000
                             │
                             ▼
                         PostgreSQL
```

No public host port is required. The application remains bound to `127.0.0.1:3000` for SSH-tunnel maintenance, and PostgreSQL remains available only inside the Compose network.

## One-time Cloudflare dashboard setup

1. Add or select a domain managed by the Cloudflare account.
2. Go to **Networking → Tunnels** and create a named tunnel, for example `personal-control-center`.
3. Add a **Published application** route.
4. Choose the desired hostname, for example `planner.example.com`.
5. Set the service URL to:

   ```text
   http://app:3000
   ```

6. Save the route.
7. Copy the Docker connector token. Treat it as a secret and enter it only in the production server's `.env` file.

The repository pins `cloudflare/cloudflared:2026.7.2`. The connector starts only when the Compose `tunnel` profile is enabled.

## First HTTPS deployment

Before pulling these changes, create a manual database dump using the currently running stack:

```bash
cd /opt/personal-control-center
mkdir -p data/backups
docker compose exec -T postgres \
  pg_dump -U pcc -d personal_control_center -Fc --no-owner --no-acl \
  > data/backups/pre-phone-deployment-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Pull the approved branch or `main` after the pull request is merged:

```bash
git fetch origin
git switch agent/slice-3-durable-deployment
git pull --ff-only
```

Edit `.env` and keep the existing database password and owner email:

```text
PCC_PUBLIC_URL=https://planner.example.com
PCC_COOKIE_SECURE=1
CLOUDFLARE_TUNNEL_TOKEN=paste-the-secret-token-here
PCC_BACKUP_INTERVAL_HOURS=24
PCC_BACKUP_RETENTION_DAYS=14
PCC_ALLOW_INSECURE_USER_HEADER=0
```

The owner bootstrap password should already be blank after the first successful login:

```text
PCC_OWNER_BOOTSTRAP_PASSWORD=
```

Start the complete production stack:

```bash
docker compose --profile tunnel up -d --build
```

Validate locally:

```bash
docker compose --profile tunnel ps
docker compose logs --tail=100 migrate
docker compose logs --tail=100 app
docker compose logs --tail=100 backup
docker compose logs --tail=100 cloudflared
curl --fail http://127.0.0.1:3000/api/health
```

Validate the public route:

```bash
curl --fail --head https://planner.example.com/login
```

## Phone validation

1. Disable Wi-Fi and open the HTTPS hostname over mobile data.
2. Sign in with the owner account.
3. Create a neutral temporary capture.
4. Open the same account on desktop and confirm the capture appears.
5. Edit or complete it on one device and confirm the other device refreshes.
6. In Chrome on Android, open the browser menu and select **Install app** or **Add to Home screen**.
7. Launch the installed application from the home screen.
8. Close and reopen it and confirm that the authenticated session remains active.
9. Repeat once over Wi-Fi.
10. Remove the temporary validation item.

The manifest exposes 192×192, 512×512, and maskable PNG icons and uses standalone display mode. Offline synchronization is not part of this slice; the installed application still requires network access.

## Automatic backups

The `backup` service creates a validated custom-format PostgreSQL dump immediately after startup and every 24 hours by default. Backups are stored on the host under:

```text
data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

Files older than `PCC_BACKUP_RETENTION_DAYS` are deleted automatically. These files are outside both the application container and PostgreSQL volume, but an occasional copy should also be moved off the DigitalOcean host.

Create an additional dump at any time:

```bash
docker compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
```

Inspect available dumps:

```bash
ls -lh data/backups
```

## Future production updates

Develop and test changes on another machine and branch. After CI passes and the pull request is approved, merge it to `main`. On the production host run:

```bash
cd /opt/personal-control-center
sh scripts/deploy-production.sh main
```

The deployment script:

1. refuses tracked local production changes;
2. records the currently deployed commit;
3. creates and validates a pre-deployment PostgreSQL dump;
4. fast-forwards to the requested remote ref;
5. runs migrations and rebuilds containers without removing volumes;
6. keeps the tunnel enabled when a token is configured;
7. waits for the health endpoint before reporting success.

Never run `docker compose down --volumes` during a normal update.

## Restore procedure

Restoration replaces the entire database and requires an explicit confirmation:

```bash
sh scripts/restore-postgres.sh data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

After restoration, verify the health endpoint, sign in, and inspect representative projects, thoughts, reviews, accomplishments, and archived records before resuming normal use.
