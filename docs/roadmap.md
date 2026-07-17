# Product Roadmap

This roadmap is intentionally compressed around a first usable personal system. Sequence matters more than fixed dates.

## Slice 1 — Phone-first foundation and feedback loop

**Status: complete and merged in PR #7.**

Delivered:

- Mobile-first Next.js application shell
- Quiet Capture landing page
- Inbox, Projects, Thoughts, Review, and All Spaces routes
- Floating mobile dock and matching desktop rail
- Quick capture with browser-local persistence
- Open and completed item status
- Weekly review with open work, completed items, and recent thoughts
- Guided reflection fields, location, and photo selection metadata
- Initial PWA manifest and home-screen installation direction
- Docker-ready runtime for later Raspberry Pi deployment
- Mobile-resilient navigation and form validation over local-network testing

## Slice 2 — Make projects actionable

**Status: active. See issue #9 and `docs/slice-2-plan.md`.**

Required outcomes:

- One shared application data provider
- Domain logic separated from React state and browser persistence
- Debounced browser writes and safe migration of existing local data
- Focused automated tests for item transitions and weekly calculations
- Dated project action points with preserved history
- Compact project cards that show only the current action and date
- Full-screen project details with a three-point timeline preview and expandable full history
- Free-form completion notes followed by a next action, Waiting, or project completion
- Active projects as the default view and Accomplishments as a secondary view
- Consistent Waiting, Incubating, Archive, Restore, and permanent deletion behavior
- Weekly review context for reached dates, opened actions, completed actions, completed projects, unresolved items, and recent thoughts
- Full phone validation of the capture-to-project workflow

Optional stretch work:

- Persist configurable dock pins
- Minor Capture, Inbox, and Projects polish based on real phone usage

## Slice 3 — Durable personal deployment

- Persistent database and photo storage
- Authentication for secure remote access
- Shared phone and desktop data
- Deploy locally or to a Raspberry Pi
- Backups, data export, and tested restoration
- Installable PWA validation on Android over HTTPS
- Durable review and place history

## After the first live version

- Standalone tasks and errands
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
- The complete manual workflow comes before specialised trackers.
- Slice 2 establishes the workflow; Slice 3 makes it safe to trust with real data.
- AI should be anticipated in the data model but must not block the manual workflow.
- Use only neutral fixtures and examples in the public repository.
- The visual GitHub Project remains optional until the issue list becomes difficult to scan.
