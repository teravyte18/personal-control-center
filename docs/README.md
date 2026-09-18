# Documentation index

This directory contains current product/operations documentation plus a small amount of explicitly historical planning material.

## Current product direction

- [`product-spec.md`](product-spec.md) — current product model, workflows, boundaries, integration principle, and success criteria
- [`roadmap.md`](roadmap.md) — completed slices through Library/Media, the selected Personal Context Layer, experimental LLM work, Weekly Rhythm, and targeted cross-space integration
- [`architecture.md`](architecture.md) — deployed stack, persistence, navigation, PWA, themes, integrations, and security boundaries
- [`interface-rules.md`](interface-rules.md) — current UI, copy, navigation, theme, and semantic-colour rules

## Feature and design guides

- [`food.md`](food.md) — implemented Food v1 Recipe Book, ingredient-copy workflow, private photos, explicit exclusions, and deferred meal-prep/routine follow-ups
- [`expenses.md`](expenses.md) — manual expense capture, fixed 50/30/20 reference, rolling Fun Fund, Insights analytics, persistence, and current boundaries
- [`markets.md`](markets.md) — lightweight Yahoo-backed watchlist with current price, daily movement, user-scoped persistence, and TradingView handoff
- [`notes.md`](notes.md) — Markdown subset, autosave rules, safe preview rendering, and regression checks
- [`book-library.md`](book-library.md) — Books shelf model, ratings, owned-first default view, Wishlist isolation, covers, caching, and regression checks
- [`media-library.md`](media-library.md) — unified Library navigation for Books, Movies, and Series; separate media wishlists/state, ratings, Movie watched date, Series resume progress, private posters, and integration boundaries
- [`personal-advisor.md`](personal-advisor.md) — current Personal Context Layer and LLM-experiment direction, including context inspection, memory ideas, model/cost learning, Keychain exclusion, action boundaries, and the gate before any permanent Advisor product
- [`google-calendar.md`](google-calendar.md) — one-way Calendar setup, projection rules, and troubleshooting
- [`offline-capture.md`](offline-capture.md) — Capture-only offline boundary, device queue, service worker, and recovery tests
- [`password-keychain.md`](password-keychain.md) — implemented encrypted-vault boundary, threat model, recovery rules, hardening, and residual risks
- [`notifications-observation.md`](notifications-observation.md) — open real-device Weekly Review notification observation tracked in issue #21

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
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — branch, validation, documentation, and safety workflow
