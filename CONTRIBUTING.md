# Contributing

## Workflow

1. Create or select a GitHub issue.
2. Clarify the outcome and acceptance criteria.
3. Create a branch using a prefix such as `feat/`, `fix/`, `docs/`, or `chore/`.
4. Keep changes focused on one coherent outcome.
5. Add or update tests where behaviour changes.
6. Open a draft pull request early.
7. Merge only after review.

## Commit style

Use concise conventional-style prefixes where practical:

- `feat:` new user-facing capability
- `fix:` defect correction
- `docs:` documentation
- `test:` tests only
- `refactor:` structural change without intended behaviour change
- `chore:` maintenance and tooling

## Product changes

For significant features, document:

- The user problem
- Proposed behaviour
- Acceptance criteria
- Important exclusions
- Dependencies

## Architecture changes

Record durable or expensive decisions in `docs/decisions/` before implementation is merged.

## Secrets

Never commit credentials, access tokens, OAuth secrets, private keys, or production environment files.
