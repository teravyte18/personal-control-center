# Project instructions

## System

- This is a phone-first private personal planning system for one or a very small number of independent users, not a commercial service.
- Users may share one application and PostgreSQL instance, but their personal data must remain completely isolated.
- Do not invent workspaces, sharing, collaboration, customer, growth, or monetisation requirements.
- Prioritise fast capture and the weekly-review ritual.
- Desktop layouts are secondary.
- The application must remain useful without AI.
- AI suggestions must never silently modify canonical user data.
- Prefer simple usable workflows over speculative abstractions.

## Public repository safety

- Treat the repository, issues, pull requests, examples, fixtures, and commit messages as public.
- Never commit personal names, employers, institutions, private projects, real tasks, locations, schedules, credentials, or other identifying information.
- Use neutral fictional examples only when examples are necessary.
- Do not commit secrets, environment files, tokens, database dumps, uploaded photos, or production exports.

## Development

- Read `docs/product-spec.md` and `docs/roadmap.md` before major changes.
- For Slice 3 work, also read `docs/slice-3-plan.md`, `docs/authentication.md`, and the active Slice 3 issue before implementation.
- Keep changes focused and reviewable; complete the Slice 3 stages in order unless there is a clear technical reason not to.
- Preserve existing browser-local data through an explicit migration and import path when server persistence is introduced.
- Keep item transitions in shared domain actions rather than page-specific handlers.
- Keep persistence, user identity, authentication, file storage, and deployment concerns behind explicit boundaries.
- Scope every personal-data read, mutation, import, export, photo reference, and recovery operation by the authenticated user ID.
- Require server-side session authorization even when routing or ingress already performs an access check.
- Keep public registration disabled; new accounts must be created through owner-controlled, expiring, one-time activation links.
- Store only derived password hashes and hashed session or invitation tokens. Never log credentials, raw tokens, cookies, activation URLs, or password values.
- Revocation must invalidate active sessions without deleting the user's personal data.
- Keep insecure identity overrides disabled outside CI and deliberate local testing.
- Run `npm run lint`, `npm test`, and `npm run build` after relevant changes.
- Do not add major dependencies without explaining why.
- Use feature branches rather than committing directly to `main`.

## Durable deployment rules

- The first live host is a small DigitalOcean VM obtained through the GitHub Student Developer Pack; the intended later host is a Raspberry Pi.
- Treat the host as replaceable. Moving between DigitalOcean and Raspberry Pi must not require application-code changes.
- Preserve compatibility with both `linux/amd64` and `linux/arm64`.
- Use portable Docker images and Docker Compose rather than provider-specific application platforms.
- Use self-hosted PostgreSQL with standard schema migrations, `pg_dump`, and `pg_restore`; do not depend on a managed database unless a later decision explicitly changes this.
- Build production images in CI rather than on the production host.
- Publish and deploy immutable image versions; do not depend on a mutable `latest` tag for production releases.
- Keep all persistent database, upload, export, and backup paths configurable and outside the container writable layer.
- Store photo references as opaque identifiers and metadata rather than absolute machine-specific paths.
- Never expose PostgreSQL directly to the public network.
- Keep secrets outside Git and outside built images; production secrets must be injected at runtime.
- Keep session cookies non-Secure only while the application is strictly localhost-bound behind the SSH tunnel. Set `PCC_COOKIE_SECURE=1` before HTTPS ingress is used for normal access.
- Implement provider-independent export and restoration before calling Slice 3 complete.
- Cloudflare R2 and automated permanent off-site backups are deferred until the application is running on Raspberry Pi and are tracked separately.
