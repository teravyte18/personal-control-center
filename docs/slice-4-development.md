# Slice 4 browser-only development

Use this setup to test Slice 4 on the Raspberry Pi without touching the production application, PostgreSQL, uploads, backups, or R2.

## Checkout

```sh
cd /home/teravyte/personal-control-center-dev
git fetch origin
git switch --track origin/agent/slice-4-tasks-weekly-review
```

If the branch is already checked out:

```sh
git pull --ff-only
```

## Local-only environment

Create `.env.local`:

```dotenv
PCC_LOCAL_DEV_MODE=1
NEXT_PUBLIC_PCC_LOCAL_DEV_MODE=1
```

Both values are required. The server value bypasses the development authentication proxy, while the public value bypasses the client session check and labels the browser-local data mode. These bypasses are ignored by production builds.

## Run

```sh
npm install
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Open the development instance from another device on the same network:

```text
http://<RASPBERRY_PI_LAN_IP>:3001
```

## Isolation

- Data is stored only in that browser's local storage.
- Phone and desktop browsers have separate development data.
- Clearing site data resets the development environment.
- Review photos are intentionally unavailable in this mode.
- PostgreSQL, production users, Tailscale Funnel, local backups, and R2 are not used.

## Notification limitation

The local-network URL uses plain HTTP, so phone browsers generally cannot grant notification permission or register the reminder service worker. The in-app overdue-review reminder and all date calculations remain testable locally. Browser/PWA notification delivery must be observed after the feature reaches the live HTTPS deployment.
