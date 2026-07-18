# Slice 3 — Durable Personal Deployment

## Purpose

Slice 3 turns the browser-local prototype into a personal system that can be trusted with real data and used from both phone and desktop.

The first live host will be a small DigitalOcean Linux VM obtained through the GitHub Student Developer Pack. This is a temporary hosting choice made so deployment work can continue before Raspberry Pi hardware is available. The intended later host is a Raspberry Pi, potentially sharing the machine with NAS services.

The central infrastructure requirement is:

> The host must be replaceable without redesigning the application or losing data.

## Agreed architecture

```text
Phone and desktop PWA
        │
        │ authenticated HTTPS
        ▼
Secure ingress
        │
        ▼
Docker host
├── Next.js application
├── PostgreSQL
└── persistent photo and export storage
```

The same logical deployment must run on:

- `linux/amd64` on the temporary DigitalOcean VM
- `linux/arm64` on the later Raspberry Pi

## Hosting decisions

### DigitalOcean is the first host, not the architecture

The first deployment uses a normal Linux VM and Docker Compose. Avoid DigitalOcean App Platform, managed PostgreSQL, provider-specific databases, or storage APIs that would make the later Raspberry Pi move harder.

The production host should only need:

- a supported Linux distribution
- Docker Engine and Docker Compose
- persistent local storage
- runtime secrets
- outbound network access

### Raspberry Pi migration is part of the design

Moving to the Raspberry Pi should consist of:

1. Install Docker and Compose.
2. Copy deployment configuration and secrets.
3. Restore PostgreSQL from a standard dump.
4. Restore the photo and export directories.
5. point secure ingress at the new host.
6. validate phone, desktop, authentication, uploads, and PWA behaviour.
7. retire the DigitalOcean VM.

Application-code changes must not be necessary for this move.

### Cloudflare R2 is deliberately later work

Cloudflare R2 will become the permanent off-site backup target after the application is running on the Raspberry Pi. It is not required for the temporary DigitalOcean stage and is tracked in a separate issue.

During the temporary cloud stage, Slice 3 still requires:

- automated PostgreSQL dumps
- complete application export
- documented host recovery
- a tested restore onto an empty environment
- a copy of important exports outside the application container and production database volume

Provider snapshots may supplement recovery but must never be the only portable backup format.

## Application and data decisions

### PostgreSQL is the canonical store

PostgreSQL becomes the source of truth for:

- captured items
- project action timelines
- thoughts
- reviews
- review drafts that should survive device changes
- place history
- archive and accomplishment state
- photo metadata

The database runs as its own container with a persistent volume. It is not exposed publicly.

Schema changes must use explicit migrations. Backup and restoration must use standard PostgreSQL tooling such as `pg_dump` and `pg_restore`.

### Browser data must migrate safely

The current browser-local dataset cannot silently disappear when server persistence is introduced.

The migration flow must:

- export the current local dataset before changing canonical storage
- validate the exported shape and version
- import it into PostgreSQL
- be idempotent or explicitly prevent duplicate imports
- preserve IDs, timestamps, archive state, action history, review history, and completion notes
- retain the original export until the server copy has been validated
- provide a clear failure state rather than partially importing data

After migration, browser storage may remain as a short-lived cache or draft mechanism but is no longer canonical.

### Photos use a replaceable storage boundary

Initial photo files live on a persistent local filesystem because both DigitalOcean and Raspberry Pi can support that model.

The application must:

- store opaque photo identifiers and metadata in PostgreSQL
- keep machine-specific paths out of domain records
- configure the storage root at runtime
- validate size and file type
- avoid serving arbitrary filesystem paths
- support export and restore of the complete photo directory

A later storage adapter may target S3-compatible object storage without changing domain behaviour.

## Authentication and secure access

The application remains single-user, but production access must still be authenticated.

Required properties:

- one allowlisted personal identity
- server-side authorization for every data-changing action and protected read
- secure session handling
- no public unauthenticated API that exposes personal data
- HTTPS for all production use
- no direct public PostgreSQL port
- secrets injected at runtime and never committed

Cloudflare Tunnel is the preferred ingress direction because it can run on both DigitalOcean and Raspberry Pi without exposing inbound host ports. The exact identity provider may be selected during implementation, but it must remain replaceable and support the single-user constraint cleanly.

## Container and release rules

Production releases must:

- support `linux/amd64` and `linux/arm64`
- use Next.js standalone output
- run as a non-root user
- keep writable state outside the container layer
- expose a health check
- be built in CI rather than on the production host
- be published to GHCR with an immutable commit or version tag
- retain the previous image long enough to roll back
- avoid depending on the mutable `latest` tag

Planned Compose services are:

```text
app
postgres
secure ingress
backup/export job
```

Only the application or ingress layer may be reachable from outside the private Docker network.

## Implementation stages

### Stage 1 — Portable production runtime

- Enable Next.js standalone output.
- Reduce the Docker runtime image to standalone server files.
- Add container health checking.
- Define the runtime environment and persistent-path contract.
- Add a production Compose file when the database integration is ready.
- Add multi-architecture image publishing to GHCR.
- Document deployment and rollback commands.

### Stage 2 — PostgreSQL persistence

- Choose a lightweight PostgreSQL access and migration approach.
- Define a schema that preserves the existing domain model and history.
- Add repository interfaces between domain behaviour and persistence.
- Keep lifecycle decisions in domain actions.
- Run PostgreSQL locally through Compose for development and tests.
- Add migration and persistence integration tests.

### Stage 3 — Browser-to-server migration

- Add a local-data export with an explicit version.
- Validate and import the export on the server.
- prevent accidental duplicate imports.
- compare counts and representative history before finalizing migration.
- keep a downloadable original export.
- remove browser storage as the canonical source only after validation.

### Stage 4 — Authentication and shared-device access

- Add single-user authentication.
- Protect server reads and writes.
- Configure secure HTTPS ingress.
- validate the same data from phone and desktop.
- test session expiry and unauthorized access.

### Stage 5 — Durable photos, export, and recovery

- Persist real photo files outside the container layer.
- Add full application export.
- Automate PostgreSQL dumps.
- document recovery from an empty host.
- restore database and photos into a clean environment.
- verify archive state, action history, reviews, and photo links after restore.

Cloudflare R2 automation remains excluded until the Raspberry Pi migration issue is started.

### Stage 6 — Production and Raspberry Pi readiness

- Deploy the complete stack to DigitalOcean.
- validate Android PWA installation over HTTPS.
- validate phone and desktop workflows against the same database.
- verify restart and host-reboot recovery.
- build and inspect the ARM64 image.
- rehearse a restore into an ARM64-compatible environment where practical.
- document the eventual DigitalOcean-to-Raspberry-Pi migration procedure.

## Definition of done

Slice 3 is complete when:

- PostgreSQL is the canonical data store.
- Existing browser-local data imports without loss.
- Phone and desktop show the same server-owned data.
- Production access is authenticated and served over HTTPS.
- Photos persist outside the container writable layer.
- The Android PWA installs and runs against the live deployment.
- AMD64 and ARM64 production images are available.
- The deployment uses immutable image versions and has a tested rollback path.
- PostgreSQL dumps and complete application exports are produced.
- A clean environment can restore the database, photos, reviews, archives, accomplishments, and action history.
- Restarting or replacing the host does not lose data.
- The future Raspberry Pi move requires deployment and restoration work, not application redesign.

## Out of scope

- Cloudflare R2 configuration before Raspberry Pi migration
- Permanent automated off-site backup infrastructure
- NAS configuration and media services
- Multi-user accounts or collaboration
- Horizontal scaling or Kubernetes
- Managed PostgreSQL
- Offline synchronization and conflict resolution
- Push notifications
- Standalone task workflow
- Library, Trips, Fitness, Habits, integrations, and AI features
