# Weekly Review notification observation

Slice 4 includes deterministic in-app reminders and a best-effort browser/PWA notification path for unfinished Weekly Reviews from Sunday through Friday after 08:00 local time.

Browser background behavior differs across platforms and power-management states. Notification delivery while the PWA is fully closed must therefore be observed on the live HTTPS installation rather than treated as guaranteed from automated tests.

Track the live observation in [issue #21](https://github.com/teravyte18/personal-control-center/issues/21). The Slice 4 workflow remains usable if browser notifications are unavailable because the application shows the overdue-review banner whenever it is opened.
