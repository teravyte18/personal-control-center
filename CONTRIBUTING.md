# Contributing

## Workflow

1. Create or select a GitHub issue, or define one clear outcome.
2. Clarify the acceptance criteria and important exclusions.
3. Create an `agent/<description>` branch.
4. Keep the change focused on one coherent result.
5. Add or update tests where behaviour changes.
6. Update current documentation when behaviour, architecture, setup, or product boundaries change.
7. Open a draft pull request early.
8. Merge only after review and passing validation.

## Commit style

Use concise conventional-style prefixes where practical:

- `feat:` new user-facing capability
- `fix:` defect correction
- `docs:` documentation
- `test:` tests only
- `refactor:` structural change without intended behaviour change
- `chore:` maintenance and tooling

## Validation

Run the checks relevant to the change:

```bash
npm run lint
npm test
npm run build
docker compose config --quiet
docker compose --profile funnel config --quiet
```

Changes affecting authentication, persistence, uploads, PWA/offline assets, Calendar integration, backups, or deployment should pass the full production-stack CI job.

## Product changes

For significant features, document:

- the user problem;
- proposed behaviour;
- acceptance criteria;
- important exclusions;
- persistence, privacy, offline, Calendar, backup, and restore implications where relevant.

Use [`docs/README.md`](docs/README.md) to find the current specification and feature guides. Keep current behaviour in the main product/architecture documents and label old slice plans as historical rather than leaving obsolete setup instructions unqualified.

## Architecture changes

Record durable or expensive decisions in `docs/architecture.md` or add a short record under `docs/decisions/` when the decision needs its own history. Include context, decision, consequences, and status.

## Secrets and personal data

Never commit credentials, access tokens, OAuth secrets, private keys, production environment files, database dumps, uploaded files, exports, or identifying personal examples.
