# Browser-only development mode

Use this mode for quick UI and domain testing without PostgreSQL, production authentication, uploads, backups, R2, or Tailscale Funnel.

## Environment

Create `.env.local`:

```dotenv
PCC_LOCAL_DEV_MODE=1
NEXT_PUBLIC_PCC_LOCAL_DEV_MODE=1
```

Both values are required. The server value bypasses the development authentication proxy, while the public value bypasses the client session check and enables browser-local state. These bypasses are ignored by production builds.

## Run

```bash
npm install
npm run dev:network -- --port 3001
```

Open the development instance from another device on the same network:

```text
http://<DEVELOPMENT_HOST_LAN_IP>:3001
```

## Boundaries

- Data is stored only in that browser's `localStorage`.
- Phone and desktop browsers have separate development data.
- Clearing site data resets the environment.
- Theme and mobile quick-access preferences are also local to that browser.
- Authentication, account isolation, shared revisions, Google Calendar, uploads, backup/restore, and production offline/PWA behaviour are not validated here.
- Review photos and Library cover uploads are intentionally unavailable or non-durable in this mode.
- The plain HTTP LAN URL may not provide production notification or service-worker behaviour.

Use the full PostgreSQL/Compose stack for persistence, authentication, integration, upload, and deployment testing.
