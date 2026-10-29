# Documentation index

This directory contains current product/operations documentation plus a small amount of explicitly historical planning material.

## Current product direction

- [`focus-atlas-trial.md`](focus-atlas-trial.md) — active owner usage trial on `agent/focus-atlas-trial` / draft PR #102; selected Figma references, preservation checklist, validation, deviations, feedback and rollback; merge approval pending
- [`product-spec.md`](product-spec.md) — current product model, workflows, boundaries, integration principle, and success criteria
- [`roadmap.md`](roadmap.md) — delivered modules, current priorities after Music verification, Weekly Rhythm/Agenda real-use decisions, and retrieval-first AI direction
- [`usage-audit-2026-10.md`](usage-audit-2026-10.md) — real-use evidence: validated workflows, low-use experiments, planning friction, and resulting product priorities
- [`weekly-rhythm.md`](weekly-rhythm.md) — implemented Weekly Rhythm MVP: weekly focus, recurring intentions, progress, Calendar commitments, Review integration, and follow-up boundaries
- [`architecture.md`](architecture.md) — deployed stack, persistence, navigation, PWA, themes, integrations, and security boundaries
- [`interface-rules.md`](interface-rules.md) — current Focus/Atlas UI, copy, navigation, theme and semantic-colour rules, with the main/trial distinction
- [`ux-refresh-2026.md`](ux-refresh-2026.md) — earlier consolidation rationale; the selected Focus/Atlas trial supersedes its visual direction
- [`ui-ux-audit-2026-10.md`](ui-ux-audit-2026-10.md) — installed-skills reassessment: 18 ranked findings, technical measurements, and broader redesign briefs pending review
- [`ui-ux-audit-2026-10-evidence.md`](ui-ux-audit-2026-10-evidence.md) — 23 fresh captures from the reassessment and a fictional reproduction recipe; private screenshots excluded
- [`ui-ux-audit-2026-10-backlog.csv`](ui-ux-audit-2026-10-backlog.csv) — ranked audit recommendations with impact, effort, and acceptance checks

## Feature and design guides

- [`ui-design-directions-2026-10.md`](ui-design-directions-2026-10.md) — editable Figma concepts, separate phone/desktop Projects layouts, skill provenance and review limits

- [`visual-review-workflow.md`](visual-review-workflow.md) — recommended before/after screenshot, design, privacy, and GitHub review workflow

- [`food.md`](food.md) — implemented Food v1 Recipe Book, ingredient-copy workflow, private photos, explicit exclusions, and deferred meal-prep/routine follow-ups
- [`expenses.md`](expenses.md) — manual expense capture, fixed 50/30/20 reference, rolling Fun Fund, Insights analytics, persistence, and current boundaries
- [`spotify-music.md`](spotify-music.md) — operational Spotify Music space: import, hourly polling, Last.fm genre backfill, playlist archive, live smoke test and troubleshooting
- [`markets.md`](markets.md) — lightweight Yahoo-backed watchlist with current price, daily movement, user-scoped persistence, and TradingView handoff
- [`notes.md`](notes.md) — Markdown subset, autosave rules, safe preview rendering, and regression checks
- [`book-library.md`](book-library.md) — Books shelf model, ratings, Wishlist, covers, implemented comic/sequential-work progress, and regression checks
- [`media-library.md`](media-library.md) — unified Library navigation for Books, Movies, and Series; separate media wishlists/state, ratings, Movie watched date, Series resume progress, private posters, and integration boundaries
- [`personal-advisor.md`](personal-advisor.md) — implemented Personal Context Layer plus the retrieval-first Advisor/LLM direction, memory boundaries, Keychain exclusion, action boundaries, and promotion gate
- [`context-retrieval-memory.md`](context-retrieval-memory.md) — planned full-history retrieval, context planning/resolution, token budgeting, episodic summaries, stable memory, and the recommended build sequence
- [`google-calendar.md`](google-calendar.md) — one-way Calendar setup, projection rules, and troubleshooting
- [`offline-capture.md`](offline-capture.md) — Capture-only offline boundary, device queue, service worker, and recovery tests
- [`password-keychain.md`](password-keychain.md) — implemented encrypted-vault boundary, threat model, recovery rules, hardening, and residual risks
- [`notifications-observation.md`](notifications-observation.md) — Weekly Review Web Push behavior, production setup, and the completed real-device observation

## Production and recovery

- [`authentication.md`](authentication.md) — owner bootstrap, invitations, sessions, revocation, and isolation
- [`security-hardening.md`](security-hardening.md) — live Funnel security controls and repeatable audit
- [`phone-deployment.md`](phone-deployment.md) — Raspberry Pi and Tailscale Funnel setup, phone validation, updates, and restore entry points
- [`review-photo-storage.md`](review-photo-storage.md) — private upload storage for Review photos, Library book covers, Food recipe photos, and Movie/Series posters
- [`offsite-backups.md`](offsite-backups.md) — encrypted Cloudflare R2/restic backups and restore rehearsal
- [`browser-only-development.md`](browser-only-development.md) — local UI/domain mode without PostgreSQL

## Historical context

- [`slice-2-plan.md`](slice-2-plan.md) — historical plan for the original single-current-action project workflow; later multiple-action behavior is documented in current product documents
- [`slice-3-plan.md`](slice-3-plan.md) — concise retrospective of the durable-deployment slice and links to the documents that supersede its original plan

Historical documents must say that they are historical. Do not follow old branch names, temporary-host instructions, browser-local assumptions, or superseded ingress/backup/product rules when current documents disagree.

## Repository-level guidance

- [`../README.md`](../README.md) — project overview and common commands
- [`../AGENTS.md`](../AGENTS.md) — instructions for coding agents
- [`../PRODUCT.md`](../PRODUCT.md) — durable product constraints and feature-preservation commitments
- [`../DESIGN.md`](../DESIGN.md) — implemented Focus + Atlas tokens, responsive composition and component rules; machine-readable companion: [`../.impeccable/design.json`](../.impeccable/design.json)
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — branch, validation, documentation, and safety workflow
