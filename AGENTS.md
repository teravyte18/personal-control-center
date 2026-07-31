# Project instructions

## Product

- This is a phone-first private planning system for one or a very small number of independent users, not a commercial service.
- Users may share one application and PostgreSQL instance, but their personal data must remain completely isolated.
- Do not invent workspaces, sharing, collaboration, customer, growth, or monetisation requirements.
- Prioritise fast capture, actionable project state, and the Weekly Review ritual.
- Desktop layouts are supported, but phone interaction remains the primary design constraint.
- The application must remain useful without AI or external integrations.
- AI suggestions must never silently modify canonical user data.
- Prefer simple usable workflows over speculative abstractions.

## Public repository safety

- Treat the repository, issues, pull requests, examples, fixtures, and commit messages as public.
- Never commit personal names, employers, institutions, private projects, real tasks, locations, schedules, credentials, or other identifying information.
- Use neutral fictional examples only when examples are necessary.
- Do not commit secrets, environment files, tokens, database dumps, uploaded files, or production exports.

## Read before changing the product

- Start with `docs/README.md` for the documentation map.
- Read `docs/product-spec.md`, `docs/roadmap.md`, and `docs/architecture.md` before major changes.
- Read `docs/interface-rules.md` for shell, copy, spacing, theme, and semantic-colour rules.
- Read the relevant feature or operations document before changing authentication, uploads, Calendar, offline capture, Funnel, backups, or the Library.
- Treat `docs/slice-3-plan.md` as historical context only; current deployment guidance lives in the architecture and operations documents.

## Development

- Keep changes focused and reviewable.
- Use `agent/<description>` branches rather than committing directly to `main`.
- Keep item transitions in shared domain actions rather than page-specific handlers.
- Keep persistence, user identity, authentication, file storage, integrations, and deployment concerns behind explicit boundaries.
- Scope every personal-data read, mutation, import, export, upload reference, Calendar mapping, and recovery operation by authenticated user ID.
- Require server-side session authorisation even when routing or ingress already performs an access check.
- Keep public registration disabled; new accounts use owner-controlled, expiring, one-time activation links.
- Store only derived password hashes and hashed session or invitation tokens. Never log credentials, raw tokens, cookies, activation URLs, OAuth refresh tokens, or password values.
- Revocation must invalidate active sessions without deleting the user's personal data.
- Keep insecure identity overrides disabled outside CI and deliberate local testing.
- Preserve the application as the source of truth for the one-way Google Calendar projection.
- Preserve stable client-generated IDs and clear pending state for offline Quick Capture; do not imply that the whole application works offline.
- Keep Notes separate from Thoughts and books separate from normal Notes.
- Preserve semantic danger, Waiting, success, disabled, and focus meaning across themes.
- Do not add major dependencies without explaining why.
- Update current documentation when behaviour, setup, architecture, or accepted product boundaries change.

## Validation

Run the relevant checks after changes:

```bash
npm run lint
npm test
npm run build
docker compose config --quiet
docker compose --profile funnel config --quiet
```

Production-sensitive changes should also pass the repository's full Compose CI validation.

## Durable deployment rules

- Production runs on a Raspberry Pi 5 through Docker Compose.
- The host remains replaceable; application state must be recoverable from standard PostgreSQL dumps, upload archives, and encrypted off-site snapshots.
- Preserve compatibility with both `linux/arm64` production and `linux/amd64` CI/development.
- Keep PostgreSQL private inside Compose and bind the application host port only to `127.0.0.1`.
- Tailscale Funnel is the only intended public ingress path.
- Keep persistent database, upload, backup, restore-staging, and Tailscale identity data outside application container layers.
- Store upload references as opaque identifiers rather than absolute machine-specific paths.
- Keep secrets outside Git and built images; inject them at runtime or through ignored read-only secret files.
- Use `PCC_COOKIE_SECURE=1` for the live HTTPS deployment and keep `PCC_ALLOW_INSECURE_USER_HEADER=0`.
- Recreate `app` and `tailscale` together when the app container is replaced outside the deployment script because Tailscale shares the app network namespace.
- Use `scripts/deploy-production.sh main` after an approved PR is merged.
- Never run `docker compose down --volumes` during normal deployment or recovery preparation.
- Cloudflare R2/restic supplements local backups; it does not replace tested local restore procedures or independent storage of the recovery credentials.
