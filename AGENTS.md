# Project instructions

## Product

- This is a phone-first personal planning application.
- Prioritize fast capture and the weekly-review ritual.
- Desktop layouts are secondary.
- The application must remain useful without AI.
- AI suggestions must never silently modify canonical user data.
- Prefer simple usable workflows over speculative abstractions.

## Development

- Read `docs/product-spec.md` and `docs/roadmap.md` before major changes.
- Keep changes focused and reviewable.
- Do not commit secrets or environment files.
- Run `npm run lint` and `npm run build` after relevant changes.
- Preserve Raspberry Pi and ARM64 deployment compatibility.
- Do not add major dependencies without explaining why.
- Use feature branches rather than committing directly to `main`.