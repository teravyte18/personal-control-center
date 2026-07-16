# Personal Control Center

A phone-first personal planning and tracking application designed to reduce cognitive load by bringing responsibilities, projects, habits, reading, travel plans, and automated activity data into one coherent system.

## Product principles

- Capture first; organise later.
- Design for frequent phone use before optimising desktop layouts.
- Show what matters now instead of everything stored.
- Keep active work separate from incubating ideas.
- Automate data entry where reliable integrations exist.
- Let AI suggest structure without silently changing user data.
- Remain useful before any external integrations are configured.

## Current prototype

The current prototype includes:

- Quick thought capture
- Browser-local persistence
- Open and completed item lists
- A weekly review with current-week context
- Guided reflection, location, and photo selection
- Responsive phone-first layout

Data currently stays in the browser where it was entered. Clearing browser storage will remove it, and it is not yet synchronised between devices.

## Run locally

### Requirements

- Node.js 22 or newer
- npm
- Git

### Install and start

```bash
git clone https://github.com/teravyte18/personal-control-center.git
cd personal-control-center
git switch feat/first-usable-prototype
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

After this pull request is merged, the `git switch feat/first-usable-prototype` step will no longer be necessary when starting from `main`.

### Test from a phone on the same network

Start the development server so it accepts connections from other devices:

```bash
npm run dev -- --hostname 0.0.0.0
```

Find the computer's local network IP address and open the following address on the phone:

```text
http://YOUR_COMPUTER_IP:3000
```

For example: `http://192.168.1.50:3000`.

The phone and computer must be on the same network. The operating-system firewall may ask for permission to allow Node.js on private networks.

## Validate a production build

```bash
npm run lint
npm run build
npm start
```

The production server is available at [http://localhost:3000](http://localhost:3000).

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
src/app/              Next.js application
components/           Shared UI components as the app grows
lib/                  Domain and infrastructure code as the app grows
docs/                 Product and architecture documentation
.github/               Issue and pull-request templates
```

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch.
3. Open a draft pull request.
4. Review behaviour and product decisions.
5. Merge into `main` after approval.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
