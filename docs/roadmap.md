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

Completed post-Slice-3 hardening in PR #14:

- Bounded login throttling and account cooldowns for the public Funnel endpoint.
- Fixed dummy password work to reduce account-enumeration timing differences.
- Private, user-scoped review-photo persistence outside the application container.
- Authenticated photo retrieval, replacement, removal, and cross-user isolation.
- Paired, validated PostgreSQL and upload archives.
- Restore support for database state and persistent photos together.
- Repeatable production security audit and zero-warning lint enforcement.

Remaining deployment follow-up:

- Externally built immutable AMD64 and ARM64 images.
- Stronger automated rollback and a later full clean-host deployment rehearsal.
- Encrypted recurring off-site backups, tracked in issue #12.
- Optional future second local copy on USB storage or the NAS.

See `docs/slice-3-plan.md`, `docs/authentication.md`, `docs/phone-deployment.md`, `docs/review-photo-storage.md`, and `docs/production-security.md` for architecture and operational instructions.

## Current delivery sequence

### 1. Encrypted off-site backups

**Status: next priority, tracked in issue #12.**

- Store client-side encrypted, deduplicated backups in a private Cloudflare R2 bucket.
- Create a fresh validated PostgreSQL dump before each off-site run.
- Include persistent review photos and restoration-critical configuration.
- Automate nightly snapshots, retention, pruning, and visible failure/staleness checks.
- Complete and document a clean restore from R2 before beginning the next product slice.

### 2. Slice 4 — Standalone tasks and scheduled Weekly Review

**Status: planned in issue #15 after issue #12.**

Standalone Tasks:

- Add a dedicated Tasks space for concrete one-off actions that do not justify a project.
- Allow creation from Capture/Inbox and directly from Tasks.
- Keep the model simple: title, optional notes, and an optional check-in date.
- Allow tasks without dates to remain open indefinitely without producing an age-based warning.
- Allow check-in dates to be changed without creating an action timeline.
- Remove completed tasks from the active Tasks space without adding a completed-task-history destination.
- Preserve only the completion metadata required by Weekly Review, saved review snapshots, export, backup, and tests.
- Show due and overdue tasks on Home/Capture using the existing attention language.
- Keep recurring work out of Tasks; recurrence belongs in a future Routine space.

Weekly Review scheduling:

- Open one review window each Saturday for a fixed preceding review period.
- Keep unfinished review data anchored to that period instead of allowing it to roll forward.
- Close the review form after completion until the following Saturday.
- Keep an unfinished review open through Friday and remind the user daily at 08:00 local time from Sunday onward.
- Discard an unfinished prior review when the next Saturday opens a fresh window.
- Include all open standalone tasks and tasks completed during the reviewed week.
- Keep completed reviews in Review History.

Targeted notification work in this slice is limited to overdue Weekly Review reminders. General task reminders and a generic notification system remain later work.

## Later modules and capabilities

- Offline-friendly capture and synchronisation
- Routines and recurring responsibilities
- Books and reading
- Trips
- Habits and running summaries
- Calendar and Strava integrations
- Broader notifications and travel-price monitoring
- Optional AI classification, task breakdown, summaries, and recommendations
- Evaluate a native Android app only if the PWA has important platform limitations

## Delivery rules

- Phone use is the primary interface assumption; desktop is a progressive enhancement.
- The complete manual workflow comes before specialised trackers.
- Slice 2 establishes the workflow; Slice 3 makes it safe to trust with real data.
- Backups are not complete until a representative clean restore has succeeded.
- One-off tasks, projects, thoughts, and future routines must remain distinct concepts.
- AI should be anticipated in the data model but must not block the manual workflow.
- Use only neutral fixtures and examples in the public repository.
- Deployment must remain portable between AMD64 and ARM64 hosts.
- Personal-data operations must always be scoped by the authenticated user identity.
- The visual GitHub Project remains optional until the issue list becomes difficult to scan.
