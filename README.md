# Personal Control Center

A phone-first, single-user planning and reflection system designed to reduce cognitive load by bringing responsibilities, projects, thoughts, reviews, and later specialised modules into one coherent place.

This repository is for personal use rather than a commercial or multi-user product. The code should still follow production-quality engineering, privacy, testing, and maintainability practices.

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
- PostgreSQL-backed canonical state shared across browsers and devices
- Explicit browser-data backup and one-time import for existing local data
- A floating five-position phone dock with permanent central Capture
- A desktop navigation rail using the same page structure
- An initial PWA manifest and portable standalone Docker runtime

Authentication and public HTTPS access are still pending. Until they are implemented, access the deployment only through the existing SSH tunnel.

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

Replace the example database password with a long random value, then start the stack:

```bash
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000). PostgreSQL is only available on the private Compose network, and the application port is bound to localhost.

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

## Existing browser-data migration

When the PostgreSQL database is empty and the current browser contains data from the earlier prototype, the application displays a migration banner.

The migration flow:

1. Creates a versioned JSON export of all local items, actions, thoughts, reviews, accomplishments, and archive state.
2. Saves a copy in browser storage.
3. Downloads the JSON file before uploading anything.
4. Imports the data transactionally into an empty PostgreSQL database.
5. Records the import identity so repeating the same import is harmless.
6. Switches the browser to server-owned data only after the import succeeds.

Keep the downloaded JSON file until the server copy has been checked from another browser. The import refuses to overwrite a non-empty server with unrelated browser data.

A fresh second browser will load the PostgreSQL state directly. Open browsers refresh from the server periodically and whenever the tab regains focus.

## Deploy this branch to the DigitalOcean host

The current deployment remains private and uses the SSH tunnel established during Droplet setup.

On the Droplet:

```bash
cd /opt/personal-control-center
git fetch origin
git switch agent/slice-3-durable-deployment
git pull --ff-only
```

Stop and remove the earlier single application container if it still exists:

```bash
docker rm -f personal-control-center 2>/dev/null || true
```

Create the deployment environment:

```bash
cp -n .env.example .env
chmod 600 .env
```

Edit `.env` and replace the sample password:

```bash
nano .env
```

Then start PostgreSQL, apply migrations, and start the application:

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

Then open [http://localhost:3000](http://localhost:3000).

### Shared-data verification

After importing the existing browser data:

1. Open the SSH tunnel and application in the normal browser.
2. Confirm the downloaded migration backup exists.
3. Add a neutral temporary capture.
4. Open an incognito window or another browser through the same `http://localhost:3000` tunnel.
5. Confirm the capture appears there after opening or focusing the page.
6. Edit or complete it in the second browser.
7. Return to the first browser and confirm the change appears after refocusing or within a few seconds.
8. Remove the temporary item when validation is complete.

This validates two independent browser stores against one PostgreSQL source of truth. Authentication and Cloudflare Tunnel must be implemented before repeating this test over a public domain or phone network.

## Validate changes

```bash
npm run lint
npm test
npm run db:migrate
npm run build
```

CI starts a real PostgreSQL service, applies migrations, builds the application, starts the production server, imports a versioned browser export, and verifies that two independent API clients observe the same canonical state.

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
src/components/       Shared navigation and interface components
src/domain/           Domain behavior, snapshots, exports, and mutations
src/server/           PostgreSQL connection and transactional storage
src/lib/              Navigation and legacy browser-storage migration
 db/migrations/       Explicit PostgreSQL schema migrations
scripts/              Operational migration commands
tests/                Domain and server-persistence validation
docs/                 Product plans, system design, and roadmap documentation
.github/               CI workflow and repository templates
```

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch.
3. Open a draft pull request.
4. Review behaviour and system decisions.
5. Merge into `main` after approval.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), [`docs/slice-3-plan.md`](docs/slice-3-plan.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
