# Personal Control Center

A phone-first personal planning and reflection system designed to reduce cognitive load by bringing responsibilities, projects, thoughts, reviews, and later specialised modules into one coherent place.

This repository is for a small private deployment rather than a commercial product. The code should still follow production-quality engineering, privacy, testing, and maintainability practices. Multiple accounts may use one PostgreSQL database, but each account has completely separate personal data.

## System principles

- Capture first; organise later.
- Design for frequent phone use before optimising desktop layouts.
- Show what matters now instead of everything stored.
- Keep active work separate from incubating ideas.
- Let future modules grow without crowding primary navigation.
- Let AI suggest structure without silently changing user data.
- Remain useful before any external integrations are configured.
- Keep all repository examples neutral because the repository is public.

## Current functionality

- A quiet Capture landing page
- Inbox clarification into projects, tasks, thoughts, and notes
- Dated project action points with preserved history
- Project filtering across Work, Education, Personal, and Incubating
- Waiting, Accomplishments, Archive, Restore, and overdue attention states
- Full-screen project detail with compact and complete action timelines
- A dedicated Thoughts space with dated, read-only cards and explicit editing
- Weekly Review and Review History modes
- Weekly Review context for reached dates, completed actions, completed projects, unresolved work, and recent thoughts
- PostgreSQL-backed canonical state shared across a user's browsers and devices
- Separate PostgreSQL state and imports for every user account
- Invite-only email/password authentication with owner-controlled access
- HTTP-only database-backed sessions and immediate session revocation
- Explicit browser-data backup and one-time import for existing local data
- A floating five-position phone dock with permanent central Capture
- A desktop navigation rail using the same page structure
- An initial PWA manifest and portable standalone Docker runtime

Public HTTPS access is still pending. Until Cloudflare Tunnel is configured, access the deployment only through the existing SSH tunnel.

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

The four dock destinations are driven by `src/lib/navigation.ts`. Future modules register in the same destination list and can later become pinnable without rebuilding the application shell.

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

Open [http://localhost:3000](http://localhost:3000) and sign in with the configured owner email and bootstrap password. After the first successful login, remove `PCC_OWNER_BOOTSTRAP_PASSWORD` from `.env` and run `docker compose up -d` again. PostgreSQL is only available on the private Compose network, and the application port is bound to localhost.

Useful checks:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose exec postgres pg_isready -U pcc -d personal_control_center
curl http://127.0.0.1:3000/api/health
```

Stop the application without deleting its database:

```bash
docker compose down
```

Do not add `--volumes` unless the PostgreSQL data is intentionally being destroyed.

### Source-based development

A local PostgreSQL instance and `DATABASE_URL` are required:

```bash
npm install
npm run db:migrate
npm run dev
```

## Authentication and user isolation

One application and one PostgreSQL instance can hold multiple users. Each user receives an independent state row containing their own items, projects, reviews, accomplishments, and archive history. Imports and exports are also scoped to that user.

There is no public registration. The configured owner signs in first, then creates one-time activation links from **All Spaces → Account & access**. Invited users choose their own password and receive an empty private dataset. Revoking an account closes its existing sessions but preserves its data for a later re-invitation.

Passwords are derived with `scrypt`. Raw session and invitation tokens are never stored in PostgreSQL. The browser receives an HTTP-only `SameSite=Lax` session cookie.

`PCC_ALLOW_INSECURE_USER_HEADER` exists only for automated isolation testing. Keep it set to `0` on DigitalOcean and Raspberry Pi. There are deliberately no shared workspaces, teams, public registration, or collaboration permissions.

See [`docs/authentication.md`](docs/authentication.md) for owner bootstrap, invitations, revocation, session duration, and HTTPS cookie configuration.

## Existing browser-data migration

When the current user's PostgreSQL state is empty and the browser contains data from the earlier prototype, the application displays a migration banner.

The migration flow:

1. Creates a versioned JSON export of all local items, actions, thoughts, reviews, accomplishments, and archive state.
2. Saves a copy in browser storage.
3. Downloads the JSON file before uploading anything.
4. Imports the data transactionally into that user's empty PostgreSQL state.
5. Records the import identity per user so repeating the same import is harmless.
6. Switches the browser to server-owned data only after the import succeeds.

Keep the downloaded JSON file until the server copy has been checked from another browser. The import refuses to overwrite non-empty state with unrelated browser data.

A fresh second browser signed into the same account will load the same PostgreSQL state directly. Open browsers refresh from the server periodically and whenever the tab regains focus.

## Deploy this branch to the DigitalOcean host

The current deployment remains private and uses the SSH tunnel established during Droplet setup.

On the Droplet:

```bash
cd /opt/personal-control-center
git fetch origin
git switch agent/slice-3-durable-deployment
git pull --ff-only
```

Back up PostgreSQL before applying the authentication migration:

```bash
mkdir -p ~/pcc-backups
docker compose exec -T postgres \
  pg_dump -U pcc -d personal_control_center -Fc \
  > ~/pcc-backups/pre-auth-$(date +%F-%H%M).dump
```

Edit the existing `.env`. Keep the current database password and add or update:

```text
PCC_DEFAULT_USER_EMAIL=YOUR_REAL_EMAIL
PCC_OWNER_BOOTSTRAP_PASSWORD=A_TEMPORARY_PASSWORD_WITH_AT_LEAST_12_CHARACTERS
PCC_COOKIE_SECURE=0
PCC_SESSION_DAYS=30
PCC_INVITE_DAYS=7
PCC_ALLOW_INSECURE_USER_HEADER=0
```

Keep `PCC_COOKIE_SECURE=0` while using the HTTP localhost SSH tunnel. Then apply migrations, rebuild, and start the application:

```bash
docker compose up -d --build
```

Validate:

```bash
docker compose ps
docker compose logs --tail=100 migrate
docker compose logs --tail=100 app
curl --fail http://127.0.0.1:3000/api/health
```

From the computer, continue using:

```bash
ssh -L 3000:127.0.0.1:3000 deploy@YOUR_DROPLET_IP
```

Open [http://localhost:3000](http://localhost:3000), sign in with the owner email and temporary password, and confirm the existing cards are present. After the first successful login, remove or empty `PCC_OWNER_BOOTSTRAP_PASSWORD` in `.env` and run:

```bash
docker compose up -d
```

### Authentication verification

1. Sign out and confirm protected pages return to the login screen.
2. Sign in again and confirm the existing owner cards remain present.
3. Open **All Spaces → Account & access**.
4. Invite a neutral test email and copy the activation link.
5. Open the link in an incognito browser, set a password, and confirm that account starts empty.
6. Add a temporary card in the invited account and confirm it does not appear in the owner account.
7. Revoke the invited account from the owner screen and confirm its incognito session is redirected to login.
8. Re-invite it only if the test account should remain available.

Do not expose the app publicly yet. The session cookie becomes Secure only after Cloudflare Tunnel provides an HTTPS-only production URL.

## Validate changes

```bash
npm run lint
npm test
npm run db:migrate
npm run build
```

CI builds the exact Compose stack, applies migrations, bootstraps the owner password, validates HTTP-only sessions, imports the owner's browser export, confirms two owner clients share state, activates an invited account, proves user data remains isolated, revokes the account, and confirms its existing session becomes unauthorized.

## Durable deployment direction

The first live host is a small DigitalOcean Linux VM obtained through the GitHub Student Developer Pack. The intended later host is a Raspberry Pi.

```text
DigitalOcean AMD64 host
        ↓ pg_dump + application export
Raspberry Pi ARM64 host
```

Provider-specific managed services are deliberately avoided. PostgreSQL runs inside the portable Compose stack and is never exposed publicly. Cloudflare R2 automated off-site backups remain deferred until the application has moved to Raspberry Pi.

See [`docs/slice-3-plan.md`](docs/slice-3-plan.md) for the complete architecture and remaining implementation stages.

## Repository structure

```text
src/app/              Next.js routes and server API endpoints
src/components/       Shared navigation and authentication guards
src/domain/           Domain behavior, snapshots, exports, and mutations
src/server/           PostgreSQL, authentication, and transactional storage
src/lib/              Navigation and legacy browser-storage migration
db/migrations/        Explicit PostgreSQL schema migrations
scripts/              Operational migration commands
tests/                Domain, persistence, and authentication validation
docs/                 Product plans, system design, and operational guides
.github/               CI workflow and repository templates
```

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch.
3. Open a draft pull request.
4. Review behaviour and system decisions.
5. Merge into `main` after approval.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), [`docs/slice-3-plan.md`](docs/slice-3-plan.md), [`docs/authentication.md`](docs/authentication.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
