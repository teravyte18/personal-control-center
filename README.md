# Personal Control Center

A phone-first personal planning and tracking application designed to reduce cognitive load by bringing responsibilities, projects, thoughts, reviews, and later specialised modules into one coherent system.

## Product principles

- Capture first; organise later.
- Design for frequent phone use before optimising desktop layouts.
- Show what matters now instead of everything stored.
- Keep active work separate from incubating ideas.
- Let future modules grow without crowding primary navigation.
- Let AI suggest structure without silently changing user data.
- Remain useful before any external integrations are configured.

## Current prototype

The current prototype includes:

- A quiet Capture landing page
- Inbox clarification into projects, tasks, thoughts, and notes
- Project filtering across Work, Education, Personal, and Incubating
- A dedicated Thoughts space
- Weekly Review and Review History modes
- Browser-local persistence with migration from the first prototype
- A floating five-position phone dock with permanent central Capture
- A desktop navigation rail using the same page structure
- An All Spaces route that already reserves room for Library, Trips, Fitness, Habits, and Settings
- An initial PWA manifest and Docker-ready runtime

Data currently stays in the browser where it was entered. Clearing browser storage will remove it, and it is not yet synchronised between devices.

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
git switch feat/first-usable-prototype
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

### Update an existing checkout

```bash
git switch feat/first-usable-prototype
git pull
npm install
npm run dev
```

After this pull request is merged, the branch-switch step will no longer be necessary when starting from `main`.

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

A LAN address using plain HTTP is not a secure browser context. The application uses an HTTP-compatible ID fallback, but full PWA installation and some future device capabilities will require HTTPS.

If the phone still displays an old disabled form after pulling new code, refresh the page completely or close and reopen the tab so it does not reuse stale development assets.

## Validate a production build

```bash
npm run lint
npm run build
npm start
```

The production server is available at [http://localhost:3000](http://localhost:3000).

Pull requests also run the same lint and production-build checks through GitHub Actions.

## Run with Docker

```bash
docker build -t personal-control-center .
docker run --rm -p 3000:3000 personal-control-center
```

Then open [http://localhost:3000](http://localhost:3000).

The Docker image is intended to remain compatible with an ARM64 Raspberry Pi deployment, but Raspberry Pi deployment and durable data storage are not implemented yet.

## Mobile installation direction

The intended first mobile distribution is an installable Progressive Web App (PWA): the web app can be added to the Android home screen and opened in an app-like window without maintaining a separate Android codebase. Native Android development remains an option only if later requirements cannot be met well through the PWA.

The current branch includes the initial web-app manifest and mobile metadata. Offline support, durable storage, background synchronisation, and push notifications will be added separately.

## Repository structure

```text
src/app/              Next.js routes
src/components/       Shared navigation and UI components
src/lib/              Navigation, data models, and browser persistence
docs/                 Product and architecture documentation
.github/               Issue templates, PR template, and CI workflow
```

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch.
3. Open a draft pull request.
4. Review behaviour and product decisions.
5. Merge into `main` after approval.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
