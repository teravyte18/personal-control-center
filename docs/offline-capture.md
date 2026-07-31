# Offline Quick Capture

Slice 6 keeps Quick Capture usable during temporary connection loss without claiming that the complete application works offline.

## Scope

The delivered feature supports:

- reopening a prepared installed PWA without network or Raspberry Pi access;
- a dedicated lightweight Capture-only screen for offline cold starts;
- creating new captures while the server is unreachable;
- durable per-user pending storage on the current browser/device;
- visible offline, pending, syncing, retry, and last-error state;
- automatic retry on reconnection, focus, visibility changes, periodic checks, and recovery from the standalone offline screen;
- duplicate-safe delivery through stable client-generated item IDs;
- recovery when the server accepted a capture but its response did not reach the phone;
- Weekly Review notification clicks through the same root-scope service worker.

Normal online operation no longer displays an Online badge. Online is the default state and remains visually silent.

Inbox organisation and editing of Projects, Tasks, Thoughts, Notes, Library, Reviews, uploads, Account settings, and Google Calendar settings remain online-only.

## Device queue

Pending captures are stored under a key scoped to the last authenticated application user:

```text
pcc-offline-captures-v1:<application-user-id>
```

Each record retains its stable item ID, add-item mutation, queue time, retry count, and last error. It leaves the queue only after server confirmation. Retrying the same stable ID returns canonical state without creating a duplicate.

Pending data is not server-backed until synchronisation succeeds. Clearing browser/PWA site data or uninstalling the PWA can remove it.

## Service worker and cold start

`public/pcc-sw.js` installs a root-scope service worker and pre-caches only:

- `public/offline-capture.html`;
- `public/offline-capture.js`;
- the PWA manifest.

Authenticated application HTML and personal API responses are not cached. Normal navigation is network-first; when navigation cannot reach the server, the worker serves the dedicated offline Capture page.

That page reads the last authenticated user identity from browser storage, writes records in the same queue format, shows pending titles, and redirects back when connectivity returns. A real HTTP 401 clears the cached identity and requires login again.

## Prepare a device after deployment

After a deployment that changes the service worker:

1. Open Personal Control Center online and sign in.
2. Keep it open for several seconds.
3. Reload or close and reopen once while still online.
4. Test a completely offline cold start.

This installs/activates the newest worker and its small public fallback; it does not cache the complete Next.js application.

## Deploy the merged implementation

Use the normal production path:

```bash
cd /opt/personal-control-center
sh scripts/deploy-production.sh main
```

No database migration or feature-specific environment variable is required.

## Acceptance tests

Use uniquely named captures so duplicates are obvious.

### Online baseline

1. Open Capture online and confirm no unnecessary Online badge is shown.
2. Create one normal capture and confirm it appears once in Inbox and on another device.
3. Reload or reopen once online to ensure the current worker is active.

### Offline while the full app is open

1. Disable connectivity.
2. Confirm explicit Offline state.
3. Create several captures and confirm the input clears after each.
4. Confirm all titles remain visible as pending.
5. Press **Retry now** while offline and confirm nothing is lost.
6. Confirm the local Inbox count includes pending captures.

### Offline cold start

1. Fully close the PWA while offline and reopen it.
2. Confirm the dedicated **Offline capture** screen appears instead of a browser network error.
3. Add captures, close/reopen again, and confirm they survive.
4. Confirm other spaces are intentionally unavailable.

### Automatic recovery

1. Leave the fallback open with pending captures.
2. Restore connectivity.
3. Confirm it returns to the full app.
4. Confirm each unique title reaches Inbox exactly once and the pending list clears.

### Raspberry Pi or app-container failure

Because Tailscale shares the app network namespace, stop both services for this test:

```bash
docker compose --profile funnel stop tailscale app
```

Confirm the phone can still use the Capture-only fallback, then restore:

```bash
docker compose --profile funnel up -d app
docker compose --profile funnel up -d --force-recreate tailscale
```

Verify local health and Funnel state, then confirm the pending item synchronises once.

### Duplicate resistance and isolation

- Queue records offline, restore connectivity, trigger manual and automatic retries together, and confirm no duplicates.
- Interrupt partial delivery and confirm only unconfirmed records remain pending.
- With a second app account, confirm one user's queue is never shown or delivered as the other user.

### Weekly Review notifications

When notifications are enabled, confirm settings still display and tapping a generated reminder opens Review.

## Failure interpretation

- A generic browser network-error page after online preparation is a release-blocking service-worker failure.
- A fallback page without a usable form means the browser has no prior authenticated user identity.
- Authentication failure after reconnection requires sign-in; queued records remain scoped to the prior identity.
- Any duplicated Inbox record after retries is release-blocking.
- Funnel remaining down after manually replacing `app` usually means `tailscale` was not recreated against the new network namespace.

## Acceptance boundary

Offline Quick Capture is complete when online capture remains normal, a prepared PWA cold-starts into the dedicated fallback, pending records survive closure, retries deliver each record once, users remain isolated, and the UI clearly limits offline support to Capture.
