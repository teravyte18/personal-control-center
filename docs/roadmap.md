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

**Status: application-side phone deployment is implemented; Cloudflare account configuration and real-phone validation remain before the slice can be accepted.**

Hosting direction:

- Use the GitHub Student Developer Pack and a small DigitalOcean Linux VM as the first live host while Raspberry Pi hardware is not yet available.
- Treat DigitalOcean as a temporary host for a portable deployment rather than as a permanent provider-specific architecture.
- Move the same containerised application and its data to a Raspberry Pi later without application-code changes.

Delivered in the active Slice 3 branch:

- PostgreSQL as the canonical store for personal state.
- Safe, versioned browser-to-server backup and import.
- One application and database serving a very small number of users with completely isolated data.
- Invite-only email/password authentication with owner-controlled activation links.
- HTTP-only database-backed sessions, owner bootstrap, logout, and immediate account revocation.
- Per-user reads, mutations, imports, exports, and browser fallback storage.
- Optional pinned Cloudflare Tunnel connector that reaches only the private app service.
- HTTPS production URL and Secure-cookie runtime configuration.
- Installable PWA manifest with Android, maskable, and Apple icon variants.
- Automatic validated daily PostgreSQL custom-format dumps with retention.
- Safe production deployment and explicit full-database restoration scripts.
- Exact Compose CI validation of authentication, synchronisation, cross-user isolation, public PWA assets, PNG dimensions, and backup readability.

Remaining before starting normal phone use:

- Create the Cloudflare tunnel and published hostname in the owner's Cloudflare account.
- Add the tunnel token and HTTPS hostname to the DigitalOcean `.env` file.
- Enable Secure cookies and start the Compose `tunnel` profile.
- Validate owner login and data synchronisation over mobile data and Wi-Fi.
- Install and relaunch the PWA on Android.

Later Slice 3 hardening that does not block initial daily phone use:

- Real photo files behind a persistent, replaceable, user-scoped storage boundary.
- Build and publish externally generated immutable AMD64 and ARM64 images.
- Rehearse application rollback and a clean-host restore.
- Copy backups off the DigitalOcean host on a recurring basis.
- Rehearse the eventual Raspberry Pi migration.

Cloudflare R2 and the permanent off-site backup leg remain deferred until the application has moved to the Raspberry Pi.

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
- Deployment must remain portable between an AMD64 cloud VM and an ARM64 Raspberry Pi.
- Personal-data operations must always be scoped by the authenticated user identity.
- The visual GitHub Project remains optional until the issue list becomes difficult to scan.
