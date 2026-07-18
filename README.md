# Personal Control Center

A phone-first personal planning and reflection system designed to reduce cognitive load by bringing responsibilities, projects, thoughts, reviews, and later specialised modules into one coherent place.

This repository is for a small private deployment rather than a commercial product. Multiple accounts may use one application and PostgreSQL database, but each account has completely separate personal data.

## System principles

- Capture first; organise later.
- Design for frequent phone use before optimising desktop layouts.
- Show what matters now instead of everything stored.
- Keep active work separate from incubating ideas.
- Let future modules grow without crowding primary navigation.
- Let AI suggest structure without silently changing user data.
- Remain useful before any external integrations are configured.
- Keep all public repository examples neutral.

## Current functionality

- Quiet Capture, Inbox clarification, Projects, Thoughts, Weekly Review, and history
- Dated project action points with preserved completion history
- Work, Education, Personal, Incubating, Waiting, Accomplishments, and Archive views
- Overdue attention states and recoverable archive transitions
- PostgreSQL-backed canonical state shared across a user's browsers and devices
- Separate state, imports, exports, sessions, and browser fallback storage for every account
- Invite-only email/password authentication with owner-controlled access and revocation
- Explicit browser-data backup and one-time migration from the earlier prototype
- Installable phone PWA manifest with 192×192, 512×512, Apple, and maskable PNG icons
- Portable standalone Docker runtime for AMD64 now and ARM64 later
- Optional pinned Cloudflare Tunnel connector for stable public HTTPS
- Automatic validated daily PostgreSQL dumps with retention
- Safe production deployment and explicit restoration scripts

The application and database remain bound to private/local interfaces. Public phone access starts only after the production operator creates a Cloudflare tunnel, enters its token in `.env`, and enables Secure cookies.

## Page map

```text
Capture (/)
Inbox (/inbox)
Projects (/projects)
  - Work
  - Education
  - Personal
  - Incubating
Thoughts (/thoughts)
Review (/review)
  - This week
  - History
All Spaces (/spaces)
  - Accomplishments
  - Archive
  - Account & access
```

## Run locally with PostgreSQL

### Requirements

- Docker Engine with Docker Compose
- Git

### First-time setup

```bash
git clone https://github.com/teravyte18/personal-control-center.git
cd personal-control-center
git switch agent/slice-3-durable-deployment
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

Stop the application without deleting its database:

```bash
docker compose down
```

Never add `--volumes` during a normal stop, rebuild, or deployment.

### Source-based development

A local PostgreSQL instance and `DATABASE_URL` are required:

```bash
npm install
npm run db:migrate
npm run dev
```

## Authentication and user isolation

There is no public registration. The configured owner signs in first, then may create one-time activation links from **All Spaces → Account & access**. Invited users choose their own password and receive an empty private dataset. Revoking an account closes its sessions but preserves its data.

Passwords are derived with `scrypt`. Raw session and invitation tokens are not stored in PostgreSQL. The browser receives an HTTP-only `SameSite=Lax` session cookie; production HTTPS additionally sets the cookie's `Secure` flag.

`PCC_ALLOW_INSECURE_USER_HEADER` is only for CI. It must remain `0` on DigitalOcean and Raspberry Pi. There are no shared workspaces, teams, public registration, or collaboration permissions.

See [`docs/authentication.md`](docs/authentication.md).

## Existing browser-data migration

When the authenticated user's PostgreSQL state is empty and their browser contains data from the earlier prototype, the application presents an explicit migration flow. It downloads and retains a versioned backup before importing anything, preserves identifiers and history, rejects unrelated overwrites, and switches to server-owned data only after the transaction succeeds.

## Phone production deployment

The repository includes a pinned `cloudflared` service under the optional `tunnel` Compose profile. The Cloudflare dashboard route must point the public hostname to:

```text
http://app:3000
```

After the tunnel token and public hostname are configured in `.env`, start the full stack with:

```bash
docker compose --profile tunnel up -d --build
```

The detailed first deployment, phone validation, PWA installation, backup, update, and restoration steps are in [`docs/phone-deployment.md`](docs/phone-deployment.md).

## Backups and recovery

The `backup` service creates a validated PostgreSQL custom-format dump on startup and every 24 hours by default:

```text
data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

Create another dump manually:

```bash
docker compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
```

Restore a selected dump only after reviewing its destructive confirmation:

```bash
sh scripts/restore-postgres.sh data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

An occasional backup should also be copied off the production host.

## Production update workflow

Develop on another machine and feature branch. After CI passes and the pull request is approved, merge to `main`. On the production host run:

```bash
sh scripts/deploy-production.sh main
```

The script records the previous commit, creates and validates a pre-deployment dump, fast-forwards the requested ref, applies migrations, preserves volumes, restarts the configured tunnel, and waits for the application health check.

## Validate changes

```bash
npm run lint
npm test
npm run build
docker compose config --quiet
```

CI additionally builds the exact Compose stack and validates migrations, authentication, cross-user isolation, public manifest/icon delivery, PNG dimensions, and a readable PostgreSQL backup.

## Durable deployment direction

The first live host is a small DigitalOcean Linux VM. The intended later host is a Raspberry Pi.

```text
DigitalOcean AMD64 host
        ↓ pg_dump + filesystem copy
Raspberry Pi ARM64 host
```

Provider-specific managed services are deliberately avoided. PostgreSQL remains private. Cloudflare R2 automated off-site backups remain deferred until the application has moved to Raspberry Pi.

See [`docs/slice-3-plan.md`](docs/slice-3-plan.md) for the architecture and remaining completion criteria.

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch and separate development environment.
3. Open a draft pull request.
4. Run source and production-stack validation.
5. Merge into `main` after approval.
6. Deploy `main` through the production deployment script.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), [`docs/slice-3-plan.md`](docs/slice-3-plan.md), [`docs/authentication.md`](docs/authentication.md), [`docs/phone-deployment.md`](docs/phone-deployment.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
