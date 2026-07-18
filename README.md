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

## Current prototype

The current prototype includes:

- A quiet Capture landing page
- Inbox clarification into projects, tasks, thoughts, and notes
- Dated project action points with preserved history
- Project filtering across Work, Education, Personal, and Incubating
- Waiting, Accomplishments, Archive, Restore, and overdue attention states
- Full-screen project detail with compact and complete action timelines
- A dedicated Thoughts space with dated, read-only cards and explicit editing
- Weekly Review and Review History modes
- Weekly Review context for reached dates, completed actions, completed projects, unresolved work, and recent thoughts
- Browser-local persistence with safe migration from earlier prototypes
- A floating five-position phone dock with permanent central Capture
- A desktop navigation rail using the same page structure
- An All Spaces route that already reserves room for Library, Trips, Fitness, Habits, and Settings
- An initial PWA manifest and portable standalone Docker runtime

Data currently stays in the browser where it was entered. Clearing browser storage will remove it, and it is not yet synchronised between devices. Slice 3 replaces this with authenticated server-owned PostgreSQL persistence and a portable deployment that starts on DigitalOcean and later moves to Raspberry Pi.

## MVP page map

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

## Run locally

### Requirements

- Node.js 22 or newer
- npm
- Git

### First-time setup

```bash
git clone https://github.com/teravyte18/personal-control-center.git
cd personal-control-center
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

### Update an existing checkout

```bash
git switch main
git pull
npm install
npm run dev
```

### Test from a phone on the same network

For quick development testing:

```bash
npm run dev:network
```

Find the computer's local network IP address and open the following address on the phone:

```text
http://YOUR_COMPUTER_IP:3000
```

For example: `http://192.168.1.50:3000`.

Development mode compiles routes on demand and can feel noticeably slow over Wi-Fi. For a more realistic phone performance test, use a production build:

```bash
npm run build
npm run start:network
```

Then open the same local-network address on the phone. The phone and computer must be on the same network, and the operating-system firewall may ask for permission to allow Node.js on private networks.

A LAN address using plain HTTP is not a secure browser context. The application uses an HTTP-compatible ID fallback, but full PWA installation and some future device capabilities require HTTPS.

If the phone still displays stale interface state after pulling new code, refresh the page completely or close and reopen the tab so it does not reuse old development assets.

## Validate a production build

```bash
npm run lint
npm test
npm run build
npm start
```

The production server is available at [http://localhost:3000](http://localhost:3000).

Pull requests run lint, automated tests, and the production build through GitHub Actions.

## Run with Docker

```bash
docker build -t personal-control-center .
docker run --rm -p 3000:3000 personal-control-center
```

Then open [http://localhost:3000](http://localhost:3000).

The image uses Next.js standalone output, runs as a non-root user, exposes a health check, and is intended to build for both AMD64 cloud hosts and ARM64 Raspberry Pi hosts. PostgreSQL, persistent photo storage, authentication, secure ingress, and production Compose configuration are added during Slice 3.

## Durable deployment direction

Slice 3 uses a small DigitalOcean Linux VM obtained through the GitHub Student Developer Pack as the first live host while Raspberry Pi hardware is not yet available.

The deployment must remain portable:

```text
DigitalOcean AMD64 host
        ↓ standard PostgreSQL dump + filesystem export
Raspberry Pi ARM64 host
```

Provider-specific managed services are deliberately avoided. PostgreSQL, persistent files, authentication, deployment, export, and tested restoration are part of Slice 3. Cloudflare R2 automated off-site backups are deferred until the system has moved to Raspberry Pi.

See [`docs/slice-3-plan.md`](docs/slice-3-plan.md) for the agreed architecture and implementation stages.

## Mobile installation direction

The intended first mobile distribution is an installable Progressive Web App (PWA): the web app can be added to the Android home screen and opened in an app-like window without maintaining a separate Android codebase. Native Android development remains an option only if later requirements cannot be met well through the PWA.

The current application includes the initial web-app manifest and mobile metadata. Slice 3 validates installation against the authenticated HTTPS deployment. Offline support, background synchronisation, and push notifications remain later work.

## Repository structure

```text
src/app/              Next.js routes
src/components/       Shared navigation and UI components
src/lib/              Navigation, domain models, and current browser persistence
docs/                 Product plans, system design, and roadmap documentation
.github/               Issue templates, PR template, and CI workflow
```

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch.
3. Open a draft pull request.
4. Review behaviour and system decisions.
5. Merge into `main` after approval.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), [`docs/slice-3-plan.md`](docs/slice-3-plan.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
