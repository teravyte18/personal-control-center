# Weekly Review notification observation

Slice 4 includes deterministic in-app reminders and a best-effort browser/PWA notification path for unfinished Weekly Reviews from Sunday through Friday after 08:00 local time.

Browser background behavior differs across platforms and power-management states. The notification path should therefore be observed on the live HTTPS installation after deployment rather than treated as guaranteed solely from automated tests.

Track the live observation in the linked GitHub follow-up issue. The Slice 4 implementation remains usable if browser notifications are unavailable because the application still shows the overdue-review banner whenever it is opened.
