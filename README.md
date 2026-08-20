# Personal Control Center

A phone-first private planning, reflection, reading, and personal-spending system that combines quick capture, projects, one-off tasks, thoughts, editable notes, weekly reviews, a personal book library, and lightweight expense tracking in one self-hosted application.

This repository targets a small personal deployment rather than a commercial product. Multiple invite-only accounts may use one application and PostgreSQL database, but each account has completely separate personal data.

## System principles

- Capture first; organise later.
- Design for frequent phone use before optimising desktop layouts.
- Show what matters now instead of everything stored.
- Keep projects, one-off tasks, thoughts, notes, books, expenses, and future routines conceptually distinct.
- Let new modules grow through All Spaces without crowding the mobile dock.
- Keep external services as optional projections or assistants rather than hidden sources of truth.
- Keep AI suggestions optional and never silently change user data.
- Keep public fixtures and examples neutral.

## Current functionality

- Quick Capture and Inbox clarification, including a durable device-local queue and Capture-only fallback during temporary connection loss
- Projects with multiple open actions, optional dates, completion notes, automatic Active/Waiting transitions, Accomplishments, Archive, and Restore
- Standalone Tasks with optional check-in dates and due/overdue attention
- Read-only-by-default Thoughts for non-actionable observations
- Editable plain-text Notes with compact cards and persistent manual ordering
- Fixed Saturday-to-Friday Weekly Review periods with generated context, draft persistence, durable photos, history, and in-app reminders
- A books-first Library with search, generated views, independent reading/ownership/priority fields, optional dates, ratings, manual Up next ordering, private covers, and review context
- Personal Expenses with fast manual expense/income entry, configurable 50/30/20-style allocation, category summaries, editable transaction history, and a manual weekly check for missed transactions
- Four configurable mobile quick-access slots, a dock-attached Spaces handle, a compact All Spaces directory, and an expanded desktop rail
- A neutral Default appearance plus Pokémon, Hades, Hades II, Hollow Knight, Silksong, Elden Ring, Cyberpunk 2077, The Witcher 3, and Stardew Valley themes
- One-way Google Calendar projection for dated open Tasks and every dated open project action
- PostgreSQL-backed canonical state shared across each user's browsers and devices
- Invite-only authentication, isolated accounts, owner-controlled access, and revocation
- Installable PWA assets with Android, maskable, and Apple icon variants
- Raspberry Pi Docker Compose deployment with Tailscale Funnel HTTPS
- Validated local PostgreSQL/upload backups and encrypted, deduplicated Cloudflare R2 snapshots
- CI validation of build, authentication, isolation, uploads, PWA/offline assets, Calendar projection, and backup readability

The host publishes the application only on `127.0.0.1:3000`. Public phone access is provided through Tailscale Funnel and authenticated application sessions. PostgreSQL is never published outside the Compose network.

## Page map

```text
Capture (/)
Inbox (/inbox)
Projects (/projects)
Tasks (/tasks)
Thoughts (/thoughts)
Notes (/notes)
Review (/review)
  - Current
  - History
Library (/library)
Expenses (/expenses)
  - Month
  - Weekly check
All Spaces (/spaces)
  - All available working spaces
  - Accomplishments
  - Archive
  - Mobile quick access
  - Account & access
```

## Documentation map

Start with [`docs/README.md`](docs/README.md) for the current documentation index and the distinction between live operational guidance and historical slice plans.

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

Never add `--volumes` during a normal stop, rebuild, deployment, or rollback.

## Development modes

### Full source-based development

Use PostgreSQL when testing authentication, user isolation, uploads, synchronisation, Calendar behaviour, expense persistence, or server persistence:

```bash
npm install
npm run db:migrate
npm run dev
```

A valid `DATABASE_URL` is required.

### Browser-only UI development

A temporary mode is available for UI and domain work without PostgreSQL:

```text
PCC_LOCAL_DEV_MODE=1
NEXT_PUBLIC_PCC_LOCAL_DEV_MODE=1
```

Place those values in `.env.local`, then run:

```bash
npm install
npm run dev:network -- --port 3001
```

This mode bypasses authentication only outside production and stores data in that browser's `localStorage`. It does not provide shared phone/desktop state, durable uploads, production Calendar behaviour, real notification behaviour, or server-persistence testing. Personal Expenses uses the authenticated server snapshot and should be tested against the full stack rather than relying on browser-only persistence.

See [`docs/browser-only-development.md`](docs/browser-only-development.md).

## Authentication and user isolation

There is no public registration. The configured owner signs in first, then may create one-time activation links from **All Spaces → Account & access**. Invited users choose their own password and receive an empty private dataset. Revoking an account closes its sessions but preserves its data.

Passwords are derived with `scrypt`. Raw session and invitation tokens are not stored in PostgreSQL. The browser receives an HTTP-only `SameSite=Lax` session cookie; production HTTPS sets the cookie's `Secure` flag.

`PCC_ALLOW_INSECURE_USER_HEADER` is only for CI and deliberate local tests and must remain `0` in production. There are no shared workspaces, teams, public registration, or collaboration permissions.

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

## Offline Quick Capture

The complete authenticated application remains online-first. After one successful online sign-in and service-worker preparation, a cold-started installed PWA can fall back to a dedicated Capture-only screen when the server or network is unavailable.

Pending captures remain device-local until PostgreSQL confirms them. Stable client-generated IDs make retries duplicate-safe. Notes, Library, Expenses, Inbox organisation, Projects, Tasks, Thoughts, Review, Account, uploads, and Calendar settings remain online-only.

See [`docs/offline-capture.md`](docs/offline-capture.md).

## Personal Expenses

Expenses is intentionally manual in the first version. Quick Add records amount, category, date, and an optional description; income uses the same flow. The monthly view compares Essentials, Fun, and Future You against configurable allocation percentages that default to 50/30/20.

Weekly check is a safety net rather than bank automation. Compare PCC's dated entries with bank activity, add or correct anything missing, then mark the period checked. Later checks include the previous boundary date once more to avoid missing a transaction made later on the day of the previous check.

There is no Trade Republic/Open Banking connection, automated matching, or CSV import in V1.

See [`docs/expenses.md`](docs/expenses.md).

## Google Calendar

Each application account may connect its own Google account. The application creates a separate **Personal Control Center** calendar and projects dated open Tasks plus every dated open project action as all-day events.

The integration is one-way: Personal Control Center remains canonical, and direct Google-side edits are not imported.

See [`docs/google-calendar.md`](docs/google-calendar.md).

## Themes and interface preferences

The theme and four mobile quick-access positions are device/browser preferences stored in `localStorage`. They apply immediately and may differ between a phone and desktop browser for the same account.

The Default theme preserves the neutral interface. Game themes change shared colour tokens, restrained border treatment, and the centre Capture artwork while preserving layout, workflows, touch targets, and semantic status colours.

See [`docs/interface-rules.md`](docs/interface-rules.md).

## Backups and recovery

The backup service creates a validated PostgreSQL custom-format dump and paired upload archive on startup and every 24 hours by default. The upload archive includes review photos and original Library cover uploads. Expense state is part of the PostgreSQL personal-data snapshot and therefore requires no separate backup path.

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

Off-site restore is staged and validated under `data/offsite-restore` before the existing destructive database/upload restore command is run.

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

CI builds the production Compose stack and validates migrations, authentication, cross-user isolation, PWA/offline assets, uploads, persistence, and backup readability.

## Development workflow

1. Start with an issue or clearly defined outcome.
2. Work on a focused `agent/<description>` branch and separate development environment.
3. Open a draft pull request.
4. Run source and production-stack validation.
5. Merge into `main` after review.
6. Deploy `main` through the production deployment script.

See [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md), and the documentation index in [`docs/README.md`](docs/README.md).
