# Offline capture

Slice 6 keeps Quick Capture usable during temporary connection loss without claiming that the complete application works offline.

## Scope

The first version supports:

- reopening a previously prepared installed PWA without network or Raspberry Pi access;
- a dedicated lightweight Capture-only screen for offline cold starts;
- creating new Quick Capture items while the Raspberry Pi is unreachable;
- durable, per-user storage of pending captures on the current browser/device;
- visible online, offline, pending, syncing, and last-error states;
- automatic retry on reconnection, focus, visibility changes, and periodic checks;
- an explicit **Retry now** action in the full app;
- duplicate-safe delivery through the existing client-generated item ID;
- recovery when the server accepted a capture but its response did not reach the phone;
- Weekly Review notification clicks through the same root-scope service worker.

Inbox organisation and editing of Projects, Tasks, Thoughts, Reviews, photos, Account settings, and Google Calendar settings remain online-only.

## Device queue

Pending captures are stored in browser storage under a key scoped to the last authenticated application user:

```text
pcc-offline-captures-v1:<application-user-id>
```

Each queued record retains the stable item ID, complete add-item mutation, queue time, retry count, and last retry error. A record leaves the queue only after the server confirms the HTTP request.

If the server inserts an item but the response is lost, the retry sends the same item ID. The server's existing add-item behavior returns canonical state without creating a duplicate.

## Service worker and cold start

`public/pcc-sw.js` installs a root-scope service worker and pre-caches only a dedicated public shell:

- `public/offline-capture.html`;
- `public/offline-capture.js`;
- the PWA manifest.

Authenticated application HTML and personal API responses are not cached. Normal navigation remains network-first. When navigation cannot reach the server, the worker serves the dedicated offline Capture screen.

That screen reads the last authenticated application user from browser storage, writes records in the same queue format as the full app, shows pending titles, and redirects back to the full app when connectivity returns. The full app then performs the normal duplicate-safe synchronisation.

Offline capture requires one successful sign-in on that device. A real HTTP 401 still clears the cached browser identity and requires login again.

## Prepare a device after deployment

After each deployment that changes the service worker:

1. Open Personal Control Center online and sign in.
2. Keep it open for several seconds.
3. Reload or close and reopen it once while still online.
4. Then test a completely offline cold start.

This online pass lets the browser install and activate the newest worker and its pre-cached shell. It does not need to cache the complete Next.js application.

## Test deployment

```bash
cd /opt/personal-control-center
git fetch --prune origin
git switch agent/offline-capture 2>/dev/null || \
  git switch --track origin/agent/offline-capture
sh scripts/deploy-production.sh agent/offline-capture
```

No database migration or new environment variable is required.

Return to the merged version with:

```bash
sh scripts/deploy-production.sh main
```

## Acceptance tests

Use uniquely named captures so duplicates are obvious.

### Online baseline

1. Open Capture online and confirm the **Online** badge.
2. Create one normal capture.
3. Confirm it appears once in Inbox and on another device.
4. Reload or reopen the app once online to ensure the current service worker is active.

### Offline while the full app is already open

1. Open Capture, then disable Wi-Fi and mobile data.
2. Confirm the status changes to **Offline**.
3. Create three captures.
4. Confirm the text field clears after each one.
5. Confirm the pending panel shows all three titles.
6. Press **Retry now** while still offline and confirm nothing is lost.
7. Confirm the local Inbox count includes pending captures.

### Offline cold start

1. Keep the phone offline and fully close the PWA.
2. Reopen it from the installed icon.
3. Confirm the dedicated **Offline capture** screen opens instead of a generic browser network error.
4. Create two captures and confirm both appear in its pending list.
5. Fully close and reopen the PWA again while still offline.
6. Confirm both titles remain and another capture can be added.

The dedicated offline screen is intentionally Capture-only. Other spaces and navigation are not expected to work offline.

### Automatic recovery from an offline cold start

1. Leave the dedicated offline screen open with pending captures.
2. Restore connectivity.
3. Confirm it opens the full app automatically.
4. Wait up to about 15 seconds.
5. Confirm the pending panel clears.
6. Confirm every unique title appears exactly once in Inbox and on another device.

### Raspberry Pi or app-container failure

The Tailscale container shares the app container's network namespace. Stopping only `app` can leave Funnel attached to a dead namespace, so the Tailscale container must be recreated after the app returns.

Stop both services for the test:

```bash
cd /opt/personal-control-center
docker compose --profile funnel stop tailscale app
```

Then:

1. Keep the phone's internet connection enabled.
2. Open or reopen the PWA.
3. Confirm the dedicated offline Capture screen appears even though the phone itself is online.
4. Add a uniquely named capture.

Restore production access:

```bash
docker compose --profile funnel up -d app
docker compose --profile funnel up -d --force-recreate tailscale
```

Verify:

```bash
curl --fail http://127.0.0.1:3000/api/health
docker compose --profile funnel ps
```

Then press **Try opening the full app** if it has not reopened automatically. Confirm the pending capture reaches Inbox exactly once.

### Duplicate resistance

1. Queue two captures offline.
2. Restore the connection.
3. Press **Retry now** repeatedly while automatic retry may also be running.
4. Toggle airplane mode during one retry if practical.
5. Confirm each title appears once and the queue clears.

### Partial recovery

1. Queue three captures in a known order.
2. Restore connectivity and interrupt it again after the first reaches Inbox.
3. Confirm later unconfirmed records remain pending.
4. Restore connectivity again and confirm all three eventually appear once.

### User isolation

With a second app account:

1. Queue and synchronise a capture as account A.
2. Sign out online and sign in as account B.
3. Confirm account A's pending queue is not shown to account B.
4. Repeat the offline test for account B.

### Weekly Review notifications

When notifications are enabled, confirm their settings still display normally. During a valid reminder period, tapping a generated notification should still open Review.

## Failure interpretation

- A generic browser network-error page after the online preparation step is a release-blocking service-worker failure.
- The dedicated offline page without a usable form means the browser has no previously authenticated user identity.
- An authentication error after reconnecting requires signing in again; queued records remain scoped to the previous user until that identity is available again.
- Browser or PWA site-data deletion also deletes the device queue.
- Any duplicated Inbox title after retries is a release-blocking failure.
- After manually stopping the app container, Funnel remaining down normally means the Tailscale container was not recreated against the app's new network namespace.

## Acceptance boundary

Slice 6 is complete when online capture remains normal, the prepared PWA cold-starts into the dedicated offline Capture screen, pending records survive closure, automatic and manual retry deliver each item once, users remain isolated, and the UI clearly limits offline support to Quick Capture.
