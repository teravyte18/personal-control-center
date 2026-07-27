# Offline capture

Slice 6 keeps Quick Capture usable during temporary connection loss without claiming that the complete application works offline.

## Scope

The first version supports:

- reopening a previously warmed installed PWA without network access;
- creating new Quick Capture items while the Raspberry Pi is unreachable;
- durable, per-user storage of pending captures on the current browser/device;
- visible online, offline, pending, syncing, and last-error states;
- automatic retry on reconnection, focus, visibility changes, and periodic checks;
- an explicit **Retry now** action;
- duplicate-safe delivery through the existing client-generated item ID;
- recovery when the server accepted a capture but its response did not reach the phone;
- Weekly Review notification clicks through the same unified service worker.

Inbox organisation and editing of Projects, Tasks, Thoughts, Reviews, photos, Account settings, and Google Calendar settings remain online-only.

## Device queue

Pending captures are stored in browser storage under a key scoped to the last authenticated application user:

```text
pcc-offline-captures-v1:<application-user-id>
```

Each queued record retains the stable item ID, complete add-item mutation, queue time, retry count, and last retry error. A record leaves the queue only after the server confirms the HTTP request.

If the server inserts an item but the response is lost, the retry sends the same item ID. The server's existing add-item behavior returns canonical state without creating a duplicate.

## Service worker

`public/pcc-sw.js` provides root-scope shell caching and preserves the existing notification-click behavior. It caches authenticated page HTML and generated Next.js static assets, but deliberately bypasses `/api/*`, login, and activation requests. Personal API responses are never cached.

Offline capture requires one successful sign-in on that device. A real HTTP 401 still clears the cached browser identity and requires login again.

## Warm the PWA

After deployment:

1. Open Personal Control Center online and sign in.
2. Stay on Capture for several seconds.
3. Reload or reopen the app once while still online.
4. Then test a completely offline cold start.

The service worker repeats the warm-up on later online app loads.

## Test deployment

```bash
cd /opt/personal-control-center
git fetch origin
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
4. Return to Capture, wait several seconds, and reload once online.

### Offline while open

1. Open Capture, then disable Wi-Fi and mobile data.
2. Confirm the status changes to **Offline**.
3. Create three captures.
4. Confirm the text field clears after each one.
5. Confirm the pending panel shows all three titles.
6. Press **Retry now** while still offline and confirm nothing is lost.
7. Confirm the local Inbox count includes pending captures.

### Offline cold start

1. Keep the captures pending and fully close the PWA.
2. Reopen it while still offline.
3. Confirm Capture opens instead of a generic browser network error.
4. Confirm the pending titles remain.
5. Add another capture, close the PWA, and reopen it offline again.
6. Confirm all pending captures remain.

If the warm-up fallback appears, reconnect, open and reload the app online once, then repeat.

### Automatic recovery

1. Leave the app open with pending captures.
2. Restore connectivity.
3. Wait up to about 15 seconds without pressing anything.
4. The app may reload once when recovering from a fully offline start.
5. Confirm the pending panel disappears.
6. Confirm every unique title appears exactly once in Inbox and on another device.

### Manual recovery

1. Make the app server temporarily unreachable while the phone still has internet access.
2. Submit a Quick Capture.
3. Confirm it becomes pending even though the phone may still show **Online**.
4. Restore the server and press **Retry now**.
5. Confirm the item appears exactly once in Inbox.

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

### Scope warning

1. Go offline and visit other already-cached routes.
2. Confirm the global warning states that only Quick Capture is supported offline.
3. Avoid relying on edits in those spaces.
4. Return to Capture and confirm queueing still works.

### User isolation

With a second app account:

1. Queue and synchronise a capture as account A.
2. Sign out online and sign in as account B.
3. Confirm account A's pending queue is not shown to account B.
4. Repeat the offline test for account B.

### Weekly Review notifications

When notifications are enabled, confirm their settings still display normally. During a valid reminder period, tapping a generated notification should still open Review.

## Failure interpretation

- A browser network-error page means the shell was not warmed or browser storage was cleared.
- An authentication error requires reconnecting and signing in again.
- Browser or PWA site-data deletion also deletes the device queue.
- Any duplicated Inbox title after retries is a release-blocking failure.

## Acceptance boundary

Slice 6 is complete when online capture remains normal, a warmed PWA can cold-start offline, pending records survive closure, automatic and manual retry deliver each item once, users remain isolated, and the UI clearly limits offline support to Quick Capture.
