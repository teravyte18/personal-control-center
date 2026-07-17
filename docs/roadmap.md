# Product Roadmap

This roadmap is intentionally compressed around a first usable version. Sequence matters more than fixed dates.

## One-week usable target

### Slice 1 — Phone-first shell and capture loop

- Mobile-first Next.js application shell
- Quiet Capture landing page
- Floating phone dock with permanent central Capture
- Matching desktop navigation rail
- All Spaces directory for future modules
- Browser-local persistence and migration
- Initial PWA manifest and home-screen installation direction
- Docker-ready runtime for later Raspberry Pi deployment

### Slice 2 — Core MVP pages

- Inbox expansion and classification
- Project areas: Work, Education, Personal, and Uncategorised
- Project statuses including Waiting and Incubating
- Dedicated Thoughts space for non-actionable material
- Weekly Review with open and completed context
- Review History
- Edit, complete, reopen, archive, and delete core items

### Slice 3 — Make projects genuinely actionable

- Desired outcome field
- Project next actions
- Task/project relationships
- Due dates and waiting follow-up dates
- Improve page hierarchy and phone interactions from real usage feedback
- Add search once the amount of stored material justifies it

### Slice 4 — Durable personal deployment

- Persistent database and photo storage
- Authentication for secure remote access
- Multi-device synchronisation
- Deploy locally or to a Raspberry Pi
- Backups and data export
- Installable PWA validation on Android

## After the first usable week

- Configurable pinned spaces
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
- The persistent dock is reserved for frequent workflows, not every module.
- New specialised modules enter through All Spaces before receiving a pin.
- The app must become usable before specialised trackers are added.
- AI should be anticipated in the data model but must not block the manual workflow.
- The visual GitHub Project is optional until the issue list becomes difficult to scan.
- Hardware purchasing is not a prerequisite for development; Raspberry Pi deployment follows validation of the workflow.
