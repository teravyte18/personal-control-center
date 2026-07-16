# Product Roadmap

This roadmap is intentionally compressed around a first usable version. Sequence matters more than fixed dates.

## One-week usable target

### Slice 1 — Phone-first foundation and feedback loop

- Mobile-first Next.js application shell
- Quick capture with browser-local persistence
- Open and completed item status
- Weekly review that shows open work and items closed during the week
- Guided reflection fields, location, and photo selection
- Initial PWA manifest and home-screen installation direction
- Docker-ready runtime for later Raspberry Pi deployment

### Slice 2 — Make captured items actionable

- Clarify inbox items into tasks, projects, and notes
- Areas and statuses
- Project next actions
- Edit, defer, incubate, archive, and delete items
- Improve the Now view from real phone usage feedback
- Establish phone navigation and touch interaction patterns

### Slice 3 — Durable personal deployment

- Persistent database and photo storage
- Authentication for secure remote access
- Review history and place history
- Deploy locally or to a Raspberry Pi
- Backups and data export
- Installable PWA validation on Android

## After the first usable week

- Offline-friendly capture and synchronisation
- Books and reading
- Trips
- Habits and running summaries
- Calendar and Strava integrations
- Notifications and travel-price monitoring
- Optional AI classification, task breakdown, summaries, and recommendations
- Push notifications
- Evaluate a native Android app only if the PWA has important platform limitations

## Delivery rules

- Phone use is the primary interface assumption; desktop is a progressive enhancement.
- The app must become usable before specialised trackers are added.
- AI should be anticipated in the data model but must not block the manual workflow.
- The visual GitHub Project is optional until the issue list becomes difficult to scan.
- Hardware purchasing is not a prerequisite for development; Raspberry Pi deployment follows validation of the workflow.
