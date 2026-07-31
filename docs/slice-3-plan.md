# Slice 3 retrospective — Durable Personal Deployment

> **Historical document.** Slice 3 is complete. Do not use old temporary-host, Cloudflare Tunnel, branch, GHCR, or “remaining stage” instructions from earlier versions of this plan. Current operations are documented in `architecture.md`, `authentication.md`, `security-hardening.md`, `phone-deployment.md`, `review-photo-storage.md`, and `offsite-backups.md`.

## Original purpose

Slice 3 replaced the browser-local prototype with a private deployment that could be trusted with real data, used from phone and desktop, and moved between hosts without redesigning the application.

The durable requirements were:

- PostgreSQL as the canonical store;
- explicit migration of earlier browser data;
- invite-only accounts with complete user isolation;
- persistent private uploads outside the application container;
- portable Docker Compose deployment on AMD64 and ARM64;
- authenticated HTTPS access;
- validated backup and restore procedures.

## Delivered result

The current production system runs on a Raspberry Pi 5 and includes:

- Next.js, PostgreSQL, migrations, app, backup, and optional Tailscale services in Docker Compose;
- one revisioned personal-data snapshot per authenticated user;
- owner bootstrap, one-time invitations, HTTP-only sessions, revocation, and login throttling;
- a localhost-only application port with public HTTPS provided by Tailscale Funnel;
- private review-photo and Library-cover storage under `data/uploads`;
- validated PostgreSQL dumps paired with upload archives;
- client-side encrypted, deduplicated Cloudflare R2/restic snapshots;
- staged off-site restore preparation and an isolated restore rehearsal;
- production deployment scripts that preserve volumes, create pre-deployment backups, run migrations, rebuild the app, reconnect Funnel, and wait for health checks;
- CI validation on AMD64 while the same Compose design runs on ARM64 production.

The temporary DigitalOcean deployment was retired after migration to the Raspberry Pi.

## Decisions that still apply

- The host is replaceable; application state must be recoverable through portable formats.
- PostgreSQL remains canonical; browser storage is limited to explicit migration/development/fallback roles and the narrow offline Capture queue.
- Every personal-data and file operation is scoped by authenticated user ID.
- PostgreSQL is not exposed publicly.
- Secrets remain outside Git and built images.
- Standard `pg_dump`, `pg_restore`, upload archives, and restic snapshots are preferred over provider-specific recovery.
- A small single-process deployment is intentional; horizontal scaling and shared collaborative editing are out of scope.

## Superseding documents

- Current system topology: [`architecture.md`](architecture.md)
- Authentication and invitations: [`authentication.md`](authentication.md)
- Live security controls: [`security-hardening.md`](security-hardening.md)
- Raspberry Pi/Funnel operations: [`phone-deployment.md`](phone-deployment.md)
- Private uploads: [`review-photo-storage.md`](review-photo-storage.md)
- Off-site recovery: [`offsite-backups.md`](offsite-backups.md)
