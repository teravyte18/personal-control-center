# Personal Control Center

A phone-first personal planning and reflection system that brings capture, projects, one-off tasks, thoughts, and weekly reviews into one private application.

This repository targets a small self-hosted deployment rather than a commercial product. Multiple invite-only accounts may use one application and PostgreSQL database, but each account has completely separate personal data.

## System principles

- Capture first; organise later.
- Design for frequent phone use before optimising desktop layouts.
- Show what matters now instead of everything stored.
- Keep projects, one-off tasks, thoughts, and future routines distinct.
- Let future modules grow without crowding primary navigation.
- Keep AI suggestions optional and never silently change user data.
- Remain useful before any external integration is configured.
- Keep public fixtures and examples neutral.

## Current functionality

- Quiet Capture and Inbox clarification
- Projects with dated action points, completion notes, Waiting, Accomplishments, Archive, and Restore
- Standalone Tasks with optional check-in dates and due/overdue attention
- Thoughts that remain non-actionable and editable only through an explicit action
- Fixed Saturday-to-Friday Weekly Review periods with generated context and history
- Durable user-scoped review photos
- Four configurable mobile quick-access slots and an expanded desktop rail
- Debounced persistence for continuously edited Inbox and Review text
- PostgreSQL-backed canonical state shared across each user's browsers and devices
- Invite-only authentication, isolated accounts, owner-controlled access, and revocation
- Installable PWA assets with Android, maskable, and Apple icon variants
- Raspberry Pi Docker Compose deployment with Tailscale Funnel HTTPS
- Validated local PostgreSQL/upload backups
- Client-side encrypted, deduplicated Cloudflare R2 backups and staged restore preparation
- CI validation of build, authentication, isolation, photos, PWA assets, and backup readability

The application binds to a local host interface. Public phone access is provided only through the Tailscale Funnel container and authenticated application sessions.

## Page map

```text
Capture (/)
Inbox (/inbox)
Projects (/projects)
  - Work, Education, Personal, and Uncategorised areas
  - Active, In progress, Waiting, and Incubating states
Tasks (/tasks)
Thoughts (/thoughts)
Review (/review)
  - Current
  - History
All Spaces (/spaces)
  - Accomplishments
  - Archive
  - Account & access
  - Mobile quick access
```

## Run the full stack locally

### Requirements

- Docker Engine with Docker Compose
- Git

### First-time setup

```bash
git clone https://github.com/teravyte18/personal-control-center.git
cd personal-control-center
cp .env.example .env
```

Replace the example database password, owner email, and temporary owner bootstrap password, then start the stack:

```bash
docker compose up -d --build
```

Open `http://localhost:3000` and sign in with the configured owner email and bootstrap password. After the first successful login, empty `PCC_OWNER_BOOTSTRAP_PASSWORD` in `.env` and recreate the app container.

Useful checks:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 backup
docker compose exec postgres pg_isready -U pcc -d personal_control_center
curl http://127.0.0.1:3000/api/health
ls -lh data/backups
```

Stop without deleting data:

```bash
docker compose down
```

Never add `--volumes` during a normal stop, rebuild, or deployment.

## Development modes

### Full source-based development

Use PostgreSQL when testing authentication, user isolation, uploads, synchronisation, or server persistence:

```bash
npm install
npm run db:migrate
npm run dev
```

A valid `DATABASE_URL` is required.

### Browser-only UI development

A temporary local mode is available for UI and domain work without PostgreSQL:

```text
PCC_LOCAL_DEV_MODE=1
NEXT_PUBLIC_PCC_LOCAL_DEV_MODE=1
```

Place those values in `.env.local`, then run:

```bash
npm install
npm run dev:network -- --port 3001
```

This mode bypasses authentication only outside production and stores data in that browser's `localStorage`. It does not provide shared phone/desktop state, durable photo uploads, production notification behavior, or server-persistence testing.

## Authentication and user isolation

There is no public registration. The configured owner signs in first, then may create one-time activation links from **All Spaces → Account & access**. Invited users choose their own password and receive an empty private dataset. Revoking an account closes its sessions but preserves its data.

Passwords are derived with `scrypt`. Raw session and invitation tokens are not stored in PostgreSQL. The browser receives an HTTP-only `SameSite=Lax` session cookie; production HTTPS additionally sets the cookie's `Secure` flag.

`PCC_ALLOW_INSECURE_USER_HEADER` is only for CI and must remain `0` in production. There are no shared workspaces, teams, public registration, or collaboration permissions.

See [`docs/authentication.md`](docs/authentication.md) and [`docs/security-hardening.md`](docs/security-hardening.md).

## Existing browser-data migration

When an authenticated user's PostgreSQL state is empty and their browser contains data from the original prototype, the application offers an explicit migration. It creates a versioned backup before importing, preserves identifiers and history, rejects unrelated overwrites, and switches to server-owned data only after the transaction succeeds.

## Phone production deployment

The optional `funnel` Compose profile runs the official Tailscale container in the app container's network namespace. Funnel HTTPS is forwarded to:

```text
http://127.0.0.1:3000
```

Enable the persistent Funnel route after registering the node:

```bash
docker compose --profile funnel exec tailscale \
  tailscale funnel --bg --https=443 http://127.0.0.1:3000
```

The result is a stable `*.ts.net` URL without a custom domain, router port forwarding, or Tailscale installation on the phone.

See [`docs/phone-deployment.md`](docs/phone-deployment.md).

## Backups and recovery

The backup service creates a validated PostgreSQL custom-format dump and paired upload archive on startup and every 24 hours by default.

Create another local backup manually:

```bash
docker compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
```

Encrypted off-site backups use `restic` with a private Cloudflare R2 bucket. Useful commands include:

```bash
sh scripts/manage-offsite-backup.sh status
sh scripts/manage-offsite-backup.sh check
sh scripts/manage-offsite-backup.sh backup-now
sh scripts/manage-offsite-backup.sh restore-latest
```

Off-site restore is staged and validated under `data/offsite-restore` before the existing destructive database restore command is run.

See [`docs/offsite-backups.md`](docs/offsite-backups.md) and [`docs/review-photo-storage.md`](docs/review-photo-storage.md).

## Production update workflow

After CI passes and a pull request is merged into `main`, run this from the production repository root:

```bash
sh scripts/deploy-production.sh main
```

The script records the previous commit, creates and validates pre-deployment database/upload backups, fast-forwards `main`, runs migrations through Compose, preserves volumes, rebuilds the application, reconnects Funnel when enabled, and waits for health checks.

## Validate changes

```bash
npm run lint
npm test
npm run build
docker compose config --quiet
docker compose --profile funnel config --quiet
```

CI builds the production Compose stack and validates migrations, authentication, cross-user isolation, PWA assets, review photos, persistence, and backup readability.

## Development workflow

1. Start with an issue or clearly defined outcome.
2. Work on a feature branch and separate development environment.
3. Open a draft pull request.
4. Run source and production-stack validation.
5. Merge into `main` after review.
6. Deploy `main` through the production deployment script.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), [`docs/architecture.md`](docs/architecture.md), [`docs/authentication.md`](docs/authentication.md), [`docs/phone-deployment.md`](docs/phone-deployment.md), [`docs/offsite-backups.md`](docs/offsite-backups.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
