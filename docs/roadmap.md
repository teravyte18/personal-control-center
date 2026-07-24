# Product Roadmap

This roadmap tracks delivered slices and the current decision space. Sequence matters more than fixed dates.

## Progress at a glance

```mermaid
graph LR
    S1["Slice 1<br/>Phone-first foundation<br/>✅ PR #7"]
    S2["Slice 2<br/>Actionable projects<br/>✅ PR #10"]
    S3["Slice 3<br/>Durable deployment<br/>✅ PR #13"]
    HARDEN["Deployment hardening<br/>auth, photos, R2<br/>✅ PR #14, #18"]
    S4["Slice 4<br/>Tasks and Weekly Review<br/>✅ PR #20, #22"]
    NEXT["Next product slice<br/>not selected"]

    S1 --> S2 --> S3 --> HARDEN --> S4 --> NEXT

    classDef done fill:#ecfdf5,stroke:#10b981,color:#065f46;
    classDef pending fill:#f8fafc,stroke:#94a3b8,color:#334155;
    class S1,S2,S3,HARDEN,S4 done;
    class NEXT pending;
```

## Slice 1 — Phone-first foundation and feedback loop

**Status: complete and merged in PR #7.**

Delivered:

- mobile-first Next.js application shell;
- quiet Capture landing page;
- Inbox, Projects, Thoughts, Review, and All Spaces routes;
- floating mobile dock and desktop rail;
- quick capture with browser-local persistence;
- basic completion states;
- Weekly Review with open work, completed items, and recent thoughts;
- guided reflection fields, location, and photo metadata;
- initial PWA manifest;
- Docker-ready runtime.

## Slice 2 — Make projects actionable

**Status: complete and merged in PR #10.**

Delivered:

- shared application data provider and domain layer;
- safe migration and debounced browser-local writes;
- dated project action points with preserved history;
- compact active-project cards showing the current action and date;
- full-screen project details and expandable timelines;
- free-form completion notes followed by a next action, Waiting, or project completion;
- overdue attention states on Capture, project cards, and timelines;
- yellow Waiting treatment without global warnings;
- Accomplishments and recoverable Archive spaces;
- Weekly Review context for project attention, opened and completed actions, completed projects, and recent thoughts;
- focused automated tests for lifecycle and date behavior.

## Slice 3 — Durable personal deployment

**Status: complete in PR #13. Production runs on Raspberry Pi.**

Delivered:

- PostgreSQL as the canonical personal-data store;
- safe browser-to-server backup and import;
- invite-only authentication for a small number of fully isolated accounts;
- HTTP-only database-backed sessions and immediate account revocation;
- per-user reads, mutations, imports, exports, photos, and browser fallback data;
- Tailscale Funnel HTTPS without a purchased domain or router port forwarding;
- Secure-cookie production configuration and a stable `*.ts.net` address;
- installable PWA icons for Android, maskable, and Apple use;
- validated local PostgreSQL dumps and paired upload archives;
- safe deployment and restoration scripts;
- exact Compose CI validation of migrations, authentication, synchronisation, cross-user isolation, PWA assets, photos, and backup readability;
- successful ARM64 deployment, reboot recovery, and retirement of the temporary DigitalOcean host.

### Post-Slice-3 hardening

PR #14 delivered:

- bounded login throttling and per-account cooldowns;
- fixed dummy password work to reduce account-enumeration timing differences;
- private user-scoped review-photo persistence;
- authenticated photo retrieval, replacement, removal, and cross-user isolation;
- paired database and upload backup/restore support;
- repeatable production security checks and zero-warning lint.

PR #18 delivered:

- client-side encrypted and deduplicated `restic` snapshots in a private Cloudflare R2 bucket;
- fresh validated database and upload backups before each off-site snapshot;
- 7 daily, 4 weekly, and 6 monthly retention with controlled pruning;
- visible backup success, age, size, and health status;
- staged off-site restore preparation that validates data before applying it;
- a successful isolated restore rehearsal without overwriting production.

Optional deployment hardening remains available but does not block product work:

- publish immutable AMD64 and ARM64 images from CI instead of building on the production host;
- automate rollback to a previously published image;
- repeat disaster recovery on a genuinely separate clean host;
- add an optional second local copy on USB storage or a future NAS.

See `docs/slice-3-plan.md`, `docs/authentication.md`, `docs/phone-deployment.md`, `docs/review-photo-storage.md`, `docs/security-hardening.md`, and `docs/offsite-backups.md`.

## Slice 4 — Standalone tasks and scheduled Weekly Review

**Status: complete in PR #20, with continuous-text persistence fixed in PR #22.**

### Standalone Tasks

Delivered:

- a dedicated Tasks space for one-off actions that do not justify a project;
- creation directly from Tasks or by classifying an Inbox capture;
- title, optional notes, area, and optional check-in date;
- undated tasks that remain open without age-based warnings;
- freely changeable task dates without an action timeline;
- due-today and overdue task attention on Capture;
- quick task completion;
- no separate completed-task archive, while retaining completion metadata for Weekly Review, export, and backup;
- a clear boundary between one-off Tasks and future recurring Routines.

### Scheduled Weekly Review

Delivered:

- one fixed review period opening each Saturday for the previous Saturday-to-Friday week;
- unfinished drafts anchored to their original period through Friday;
- completion lockout until the next Saturday;
- replacement of an unfinished stale draft when a new Saturday opens;
- generated context for project attention, opened/completed actions, completed projects, open tasks, completed tasks, and recent thoughts;
- review history with the actual reviewed period;
- an in-app reminder from Sunday through Friday after 08:00 while the review remains unfinished;
- a narrow best-effort browser/PWA notification path.

Real background notification behavior remains an observation task in issue #21 and does not block use of the in-app reminder.

### Navigation and persistence polish

Also delivered:

- four configurable mobile quick-access destinations stored per browser/device;
- all primary destinations in the desktop rail;
- debounced Inbox and Weekly Review text persistence after roughly 800 ms of inactivity;
- immediate flush on blur and before organising or completing a review;
- discrete actions such as dates, statuses, completion, and selectors remaining immediate.

## Current decision point

No product-facing Slice 5 has been selected yet.

The next session should choose one focused outcome rather than starting several modules at once. Current candidates are:

- **Routines** — recurring responsibilities that should not be represented as one-off tasks;
- **Library** — books, reading status, progress, notes, and recommendations later;
- **Trips** — trip ideas, decisions, budgets, and later supported price monitoring;
- **Fitness** — imported running activity and weekly trends;
- **Offline capture** — reliable capture while disconnected, followed by deliberate synchronisation.

In parallel, issue #21 can remain open while Weekly Review notifications are observed on the installed production phone.

## Later capabilities

- calendar and Strava integrations;
- broader notifications and conditional monitoring;
- travel-price monitoring;
- optional AI classification, task breakdown, summaries, duplicate detection, and recommendations;
- richer voice or video review capture;
- native Android evaluation only if the PWA has a demonstrated platform limitation.

## Delivery rules

- Phone use is the primary interface assumption; desktop is a progressive enhancement.
- Complete one useful workflow before adding breadth.
- One-off tasks, projects, thoughts, and recurring routines remain distinct concepts.
- Personal-data operations must always be scoped by authenticated user identity.
- Backups are only trusted after a representative restore succeeds.
- Optional infrastructure hardening should not silently replace the agreed product priority.
- AI must remain optional, transparent, and reviewable.
- Public fixtures, examples, issues, and documentation must remain neutral.
- Deployment must remain portable between AMD64 and ARM64.
