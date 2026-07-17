# Project instructions

## System

- This is a single-user, phone-first personal planning system, not a commercial product or multi-user service.
- Apply product-grade engineering practices without inventing customer, growth, collaboration, or monetisation requirements.
- Prioritise fast capture and the weekly-review ritual.
- Desktop layouts are secondary.
- The application must remain useful without AI.
- AI suggestions must never silently modify canonical user data.
- Prefer simple usable workflows over speculative abstractions.

## Public repository safety

- Treat the repository, issues, pull requests, examples, fixtures, and commit messages as public.
- Never commit personal names, employers, institutions, private projects, real tasks, locations, schedules, credentials, or other identifying information.
- Use neutral fictional examples only when examples are necessary.
- Do not commit secrets or environment files.

## Development

- Read `docs/product-spec.md` and `docs/roadmap.md` before major changes.
- Keep changes focused and reviewable.
- Run `npm run lint` and `npm run build` after relevant changes.
- Preserve Raspberry Pi and ARM64 deployment compatibility.
- Do not add major dependencies without explaining why.
- Use feature branches rather than committing directly to `main`.
