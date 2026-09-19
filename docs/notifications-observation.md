# Weekly Review reminders

Weekly Review keeps Saturday as the intended review day.

If the current review is still unfinished, PCC can send one catch-up reminder per subscribed device each local morning from Sunday through Friday after 08:00. The in-app overdue reminder remains available whenever PCC is opened.

## Why Web Push is required

The original Slice 4 browser-notification path was observed on the real installed phone in issue #21. It could display a notification only after PCC itself was opened or resumed. A service worker cannot reliably wake itself at an arbitrary clock time without an external event.

The reliable implementation therefore uses standard Web Push:

1. the installed browser/PWA creates a Push subscription after explicit notification permission;
2. PCC stores that subscription user-scoped with the device's IANA timezone;
3. an hourly Raspberry Pi worker calls a protected internal scheduler endpoint;
4. the scheduler checks each user's current Weekly Review completion state;
5. eligible subscriptions receive at most one reminder for that local date;
6. the service worker receives the push even when the PWA is closed and displays the notification;
7. tapping the notification opens `/review`.

The push message carries no personal payload. It is only a wake-up signal; the service worker displays the fixed Weekly Review reminder text.

## Reminder rules

- Saturday: no catch-up push; this is the intended review day.
- Sunday-Friday before 08:00 local device time: no push.
- Sunday-Friday after 08:00: one push per subscribed device if the review period is not completed.
- After completion: no further reminders for that period.
- A scheduler retry cannot send another successful reminder on the same local date.
- Removed/expired Push endpoints are deleted when the Push service reports them gone.
- In-app reminders remain the fallback when Web Push is unavailable or disabled.

## Production setup

Generate the VAPID key pair and worker token once:

```bash
node scripts/generate-web-push-keys.mjs
```

Copy the output into the production `.env` and replace the placeholder subject with a real `mailto:` address or HTTPS contact URL:

```dotenv
PCC_WEB_PUSH_PUBLIC_KEY=...
PCC_WEB_PUSH_PRIVATE_KEY=...
PCC_WEB_PUSH_SUBJECT=mailto:you@example.com
PCC_REVIEW_PUSH_WORKER_TOKEN=...
PCC_REVIEW_PUSH_INTERVAL_SECONDS=3600
```

Keep the VAPID keys stable. Replacing them invalidates the assumptions behind existing browser subscriptions and devices may need to subscribe again.

Redeploy after changing the environment.

## Device setup

1. Open Review on the HTTPS-installed PCC PWA.
2. Choose **Enable Weekly Review reminders**.
3. Approve the browser notification permission.
4. PCC registers the browser Push subscription and its timezone with the signed-in PCC account.

Each browser/device opts in independently.

## Security boundary

- Push subscriptions are scoped to authenticated PCC users.
- The public VAPID key may be exposed to the browser; the private VAPID key stays server-side.
- The hourly worker calls an internal endpoint protected by a separate bearer token.
- The Push endpoint receives no review text, user data, project data, or other personal payload from PCC; only an authenticated empty push is sent.
- Revoked PCC accounts are excluded from delivery.
- Push failures do not affect Review data or normal app operation.

Issue #21 records the completed live observation of the old limitation. Issue #74 tracks this reliable Web Push implementation.
