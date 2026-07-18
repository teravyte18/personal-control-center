# Slice 3 — Durable Personal Deployment

## Purpose

Slice 3 turns the browser-local prototype into a private system that can be trusted with real data and used from both phone and desktop.

The first live host is a small DigitalOcean Linux VM obtained through the GitHub Student Developer Pack. This is temporary hosting while Raspberry Pi hardware is unavailable. The intended later host is a Raspberry Pi, potentially sharing the machine with NAS services.

The deployment is primarily for one person but must support a very small number of independent accounts without running a separate application stack for each person.

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

One application and one PostgreSQL instance may serve one or two allowlisted users. Every user has completely separate items, projects, reviews, imports, exports, accomplishments, and archive history. Shared workspaces and collaboration are not required.

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
5. Point secure ingress at the new host.
6. Validate phone, desktop, user isolation, authentication, uploads, and PWA behaviour.
7. Retire the DigitalOcean VM.

Application-code changes must not be necessary for this move.

### Cloudflare R2 is deliberately later work

Cloudflare R2 becomes the permanent off-site backup target after the application is running on the Raspberry Pi. It is not required for the temporary DigitalOcean stage and is tracked in a separate issue.

During the temporary cloud stage, Slice 3 still requires:

- automated PostgreSQL dumps
- complete application exports
- documented host recovery
- a tested restore onto an empty environment
- a copy of important exports outside the application container and production database volume

Provider snapshots may supplement recovery but must never be the only portable backup format.

## Application and data decisions

### PostgreSQL is the canonical store

PostgreSQL is the source of truth for:

- users and their isolated state
- captured items
- project action timelines
- thoughts
- reviews and review drafts
- place history
- archive and accomplishment state
- photo metadata
- import records and export data

The database runs as its own container with a persistent volume. It is not exposed publicly.

Schema changes use explicit migrations. Backup and restoration use standard PostgreSQL tooling such as `pg_dump` and `pg_restore`.

### User isolation is simple and mandatory

The deployment does not use workspaces or separate Docker stacks per person.

The persistence model is:

```text
users
└── personal_data_state (one canonical snapshot per user)
    ├── items and project history
    ├── reviews
    ├── accomplishments
    └── archive state
```

Requirements:

- every read, mutation, import, and export is scoped by the resolved user ID
- two sessions for the same user see the same data
- different users in the same database cannot see or modify each other's data
- a new user starts with empty state
- the existing singleton dataset is preserved as the initial owner's state
- no public registration
- no shared workspaces, invitations, teams, or collaboration permissions

Until authentication exists, normal deployment resolves only `PCC_DEFAULT_USER_EMAIL`. A test-only identity header may be enabled in CI or local development, but it must remain disabled in real deployments.

### Browser data must migrate safely

The earlier browser-local dataset cannot silently disappear when server persistence is introduced.

The migration flow must:

- export the current local dataset before changing canonical storage
- validate the exported shape and version
- import it into the current user's PostgreSQL state
- be idempotent per user or explicitly prevent duplicate imports
- preserve IDs, timestamps, archive state, action history, review history, and completion notes
- retain the original export until the server copy has been validated
- provide a clear failure state rather than partially importing data

After migration, browser storage may remain as fallback protection but is no longer canonical.

### Photos use a replaceable storage boundary

Initial photo files live on a persistent local filesystem because both DigitalOcean and Raspberry Pi support that model.

The application must:

- store opaque photo identifiers and metadata in PostgreSQL
- keep machine-specific paths out of domain records
- configure the storage root at runtime
- validate size and file type
- avoid serving arbitrary filesystem paths
- support export and restore of the complete photo directory
- scope photo metadata and access by user

A later storage adapter may target S3-compatible object storage without changing domain behaviour.

## Authentication and secure access

Production access must authenticate every user and resolve one internal user identity before any personal-data operation.

Required properties:

- a small allowlist controlled by the owner
- one private personal dataset per identity
- server-side authorization for every protected read and mutation
- secure session handling
- no public unauthenticated API that exposes personal data
- HTTPS for all production use
- no direct public PostgreSQL port
- secrets injected at runtime and never committed
- no insecure identity header in production

Cloudflare Tunnel is the preferred ingress because it can run on both DigitalOcean and Raspberry Pi without exposing inbound host ports. The exact identity provider may be selected during implementation, but it must provide a verified email or stable subject that maps to the internal user record.

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
- Add a production Compose file.
- Add multi-architecture image publishing to GHCR.
- Document deployment and rollback commands.

### Stage 2 — PostgreSQL persistence

- Choose a lightweight PostgreSQL access and migration approach.
- Define a schema that preserves the existing domain model and history.
- Keep lifecycle decisions in domain actions.
- Run PostgreSQL through Compose for development and tests.
- Add migration and persistence integration tests.

### Stage 3 — Browser-to-server migration

- Add a local-data export with an explicit version.
- Validate and import the export on the server.
- Prevent accidental duplicate imports.
- Keep a downloadable original export.
- Remove browser storage as the canonical source only after validation.

### Stage 4 — User isolation and authentication

- Store one canonical personal-data state per user.
- Preserve the existing dataset as the initial owner's state.
- Scope reads, mutations, imports, and exports by user ID.
- Prove same-user sharing and cross-user isolation in Compose CI.
- Add authenticated user resolution.
- Keep account creation owner-controlled.
- Configure secure HTTPS ingress.
- Validate phone and desktop for each allowed account.
- Test session expiry and unauthorized access.

### Stage 5 — Durable photos, export, and recovery

- Persist real photo files outside the container layer.
- Add full per-user and full-instance export procedures.
- Automate PostgreSQL dumps.
- Document recovery from an empty host.
- Restore database and photos into a clean environment.
- Verify users, archives, accomplishments, reviews, action history, and photo links after restore.

Cloudflare R2 automation remains excluded until the Raspberry Pi migration issue is started.

### Stage 6 — Production and Raspberry Pi readiness

- Deploy the complete stack to DigitalOcean.
- Validate Android PWA installation over HTTPS.
- Validate phone and desktop workflows against the same user state.
- Validate that separate accounts remain isolated.
- Verify restart and host-reboot recovery.
- Build and inspect the ARM64 image.
- Rehearse a restore into an ARM64-compatible environment where practical.
- Document the DigitalOcean-to-Raspberry-Pi migration procedure.

## Definition of done

Slice 3 is complete when:

- PostgreSQL is the canonical data store.
- Existing browser-local data imports without loss.
- Phone and desktop show the same server-owned data for the same account.
- Different accounts in the same PostgreSQL database remain isolated.
- Production access is authenticated and served over HTTPS.
- Photos persist outside the container writable layer and are user-scoped.
- The Android PWA installs and runs against the live deployment.
- AMD64 and ARM64 production images are available.
- The deployment uses immutable image versions and has a tested rollback path.
- PostgreSQL dumps and complete application exports are produced.
- A clean environment can restore users, database state, photos, reviews, archives, accomplishments, and action history.
- Restarting or replacing the host does not lose data.
- The future Raspberry Pi move requires deployment and restoration work, not application redesign.

## Out of scope

- Cloudflare R2 configuration before Raspberry Pi migration
- Permanent automated off-site backup infrastructure
- NAS configuration and media services
- Shared workspaces or collaboration
- Public registration and account recovery flows
- Granular roles and permissions
- Horizontal scaling or Kubernetes
- Managed PostgreSQL
- Offline synchronization and conflict resolution
- Push notifications
- Standalone task workflow
- Library, Trips, Fitness, Habits, integrations, and AI features
