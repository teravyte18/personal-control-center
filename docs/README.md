# Documentation index

This directory contains current product/operations documentation plus a small amount of explicitly historical planning material.

## Current product direction

- [`product-spec.md`](product-spec.md) — current product model, workflows, boundaries, and success criteria
- [`roadmap.md`](roadmap.md) — completed slices, open observations, and the selected Keychain → Media → Personal Advisor sequence
- [`architecture.md`](architecture.md) — deployed stack, persistence, navigation, PWA, themes, integrations, and security boundaries
- [`interface-rules.md`](interface-rules.md) — current UI, copy, navigation, theme, and semantic-colour rules

## Feature guides

- [`expenses.md`](expenses.md) — manual expense capture, fixed 50/30/20 reference, rolling Fun Fund, Insights analytics, persistence, and current boundaries
- [`notes.md`](notes.md) — Markdown subset, autosave rules, safe preview rendering, and regression checks
- [`book-library.md`](book-library.md) — Library model, ratings, owned-first default view, Wishlist isolation, covers, caching, and regression checks
- [`media-library.md`](media-library.md) — selected Films and Series space, lightweight personal media model, recommendation signals, and first-slice exclusions
- [`personal-advisor.md`](personal-advisor.md) — selected opt-in LLM layer, per-domain data permissions, context construction, Keychain exclusion, and read-only v1 boundary
- [`google-calendar.md`](google-calendar.md) — one-way Calendar setup, projection rules, and troubleshooting
- [`offline-capture.md`](offline-capture.md) — Capture-only offline boundary, device queue, service worker, and recovery tests
- [`password-keychain.md`](password-keychain.md) — selected encrypted-vault boundary, threat model, recovery rules, and staged implementation plan
- [`notifications-observation.md`](notifications-observation.md) — open real-device Weekly Review notification observation tracked in issue #21

## Production and recovery

- [`authentication.md`](authentication.md) — owner bootstrap, invitations, sessions, revocation, and isolation
- [`security-hardening.md`](security-hardening.md) — live Funnel security controls and repeatable audit
- [`phone-deployment.md`](phone-deployment.md) — Raspberry Pi and Tailscale Funnel setup, phone validation, updates, and restore entry points
- [`review-photo-storage.md`](review-photo-storage.md) — private upload storage for review photos and Library covers
- [`offsite-backups.md`](offsite-backups.md) — encrypted Cloudflare R2/restic backups and restore rehearsal
- [`browser-only-development.md`](browser-only-development.md) — local UI/domain mode without PostgreSQL

## Historical context

- [`slice-2-plan.md`](slice-2-plan.md) — historical plan for the original single-current-action project workflow; later multiple-action behavior is documented in the current product documents
- [`slice-3-plan.md`](slice-3-plan.md) — concise retrospective of the durable-deployment slice and links to the documents that supersede its original plan

Historical documents must say that they are historical. Do not follow old branch names, temporary-host instructions, browser-local assumptions, or superseded ingress/backup/product rules when current documents disagree.

## Repository-level guidance

- [`../README.md`](../README.md) — project overview and common commands
- [`../AGENTS.md`](../AGENTS.md) — instructions for coding agents
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — branch, validation, documentation, and safety workflow
