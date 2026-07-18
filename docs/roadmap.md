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

**Status: complete and merged in PR #10.**

Delivered:

- One shared application data provider
- Domain logic separated from React state and browser persistence
- Debounced browser writes and safe migration of existing local data
- Focused automated tests for item transitions, archive recovery, and weekly calculations
- Dated project action points with preserved history
- Compact active-project cards that show only the current action and date
- Full-screen project details with a three-point timeline preview and full detail available for any recorded history
- Free-form completion notes followed by a next action, Waiting, or project completion
- Overdue attention states on Capture, project cards, and timelines
- Yellow Waiting project treatment without global warnings
- Completed projects available through an Accomplishments space
- Recoverable Archive space that restores projects to their previous status
- Weekly review context for reached dates, opened actions, completed actions, completed projects, unresolved items, and recent thoughts
- Full phone validation of capture, action timelines, Waiting, Accomplishments, Archive, and Restore

Optional stretch work:

- Persist configurable dock pins
- Minor Capture, Inbox, and Projects polish based on real phone usage

## Slice 3 — Durable personal deployment

**Status: architecture agreed; implementation starting.**

Hosting direction:

- Use the GitHub Student Developer Pack and a small DigitalOcean Linux VM as the first live host while Raspberry Pi hardware is not yet available.
- Treat DigitalOcean as a temporary host for a portable deployment rather than as a permanent provider-specific architecture.
- Move the same containerised application and its data to a Raspberry Pi later without application-code changes.

Required outcomes:

- PostgreSQL becomes the canonical store for items, project action history, thoughts, reviews, and place history.
- Existing browser-local data has an explicit, safe, and repeatable import path.
- Phone and desktop use the same authenticated server-owned data.
- Photos use persistent filesystem storage behind a replaceable storage boundary.
- The application is reachable through authenticated HTTPS and can be installed as a PWA on Android.
- The production runtime is Docker Compose based, supports both `linux/amd64` and `linux/arm64`, and avoids unnecessary provider lock-in.
- Production images are built outside the host, published with immutable versions, and can be rolled back.
- PostgreSQL dumps, data export, host recovery, and a complete restoration procedure are implemented and tested.
- Raspberry Pi migration is rehearsed from standard PostgreSQL and filesystem backups.

Cloudflare R2 and the permanent off-site backup leg are deliberately deferred until the application has moved to the Raspberry Pi. They are tracked as separate post-migration infrastructure work.

See `docs/slice-3-plan.md` for architecture decisions, stages, and completion criteria.

## After the first live version

- Raspberry Pi off-site backups to Cloudflare R2
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
- Deployment must remain portable between an AMD64 cloud VM and an ARM64 Raspberry Pi.
- The visual GitHub Project remains optional until the issue list becomes difficult to scan.
