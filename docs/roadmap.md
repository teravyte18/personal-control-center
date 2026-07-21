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

**Status: complete in PR #13. Production runs on Raspberry Pi.**

Delivered:

- PostgreSQL as the canonical store for personal state.
- Safe, versioned browser-to-server backup and import.
- One application and database serving a very small number of users with completely isolated data.
- Invite-only email/password authentication with owner-controlled activation links.
- HTTP-only database-backed sessions, owner bootstrap, logout, and immediate account revocation.
- Per-user reads, mutations, imports, exports, and browser fallback storage.
- Tailscale Funnel HTTPS ingress with no purchased domain or exposed router ports.
- Secure-cookie production configuration and a stable `*.ts.net` address.
- Installable PWA manifest with Android, maskable, and Apple icon variants.
- Automatic validated daily PostgreSQL custom-format dumps with retention.
- Safe production deployment and explicit full-database restoration scripts.
- Exact Compose CI validation of authentication, synchronisation, cross-user isolation, public PWA assets, PNG dimensions, and backup readability.
- Successful ARM64 deployment on Raspberry Pi.
- Phone and desktop login and shared-state validation.
- Successful Raspberry Pi reboot and automatic service recovery.
- Retirement and destruction of the temporary DigitalOcean host.

Accepted follow-up work, not part of Slice 3 completion:

- Real photo files behind a persistent, replaceable, user-scoped storage boundary.
- Externally built immutable AMD64 and ARM64 images.
- Clean-host restoration rehearsal and stronger rollback automation.
- Recurring encrypted off-site backups, tracked in issue #12.

See `docs/slice-3-plan.md`, `docs/authentication.md`, and `docs/phone-deployment.md` for architecture and operational instructions.

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
- Deployment must remain portable between AMD64 and ARM64 hosts.
- Personal-data operations must always be scoped by the authenticated user identity.
- The visual GitHub Project remains optional until the issue list becomes difficult to scan.
