# Documentation index

This directory contains current product/operations documentation plus a small amount of explicitly historical planning material.

## Current product direction

- [`product-spec.md`](product-spec.md) — current product model, workflows, boundaries, and success criteria
- [`roadmap.md`](roadmap.md) — completed slices, open observations, and unselected future candidates
- [`architecture.md`](architecture.md) — deployed stack, persistence, navigation, PWA, themes, integrations, and security boundaries
- [`interface-rules.md`](interface-rules.md) — current UI, copy, navigation, theme, and semantic-colour rules

## Feature guides

- [`notes.md`](notes.md) — Markdown subset, autosave rules, safe preview rendering, and regression checks
- [`book-library.md`](book-library.md) — Library model, ratings, views, covers, caching, and regression checks
- [`google-calendar.md`](google-calendar.md) — one-way Calendar setup, projection rules, and troubleshooting
- [`offline-capture.md`](offline-capture.md) — Capture-only offline boundary, device queue, service worker, and recovery tests
- [`password-keychain.md`](password-keychain.md) — accepted encrypted-vault boundary, threat model, recovery rules, and staged implementation plan
- [`notifications-observation.md`](notifications-observation.md) — open real-device Weekly Review notification observation tracked in issue #21

## Production and recovery

- [`authentication.md`](authentication.md) — owner bootstrap, invitations, sessions, revocation, and isolation
- [`security-hardening.md`](security-hardening.md) — live Funnel security controls and repeatable audit
- [`phone-deployment.md`](phone-deployment.md) — Raspberry Pi and Tailscale Funnel setup, phone validation, updates, and restore entry points
- [`review-photo-storage.md`](review-photo-storage.md) — private upload storage for review photos and Library covers
- [`offsite-backups.md`](offsite-backups.md) — encrypted Cloudflare R2/restic backups and restore rehearsal
- [`browser-only-development.md`](browser-only-development.md) — local UI/domain mode without PostgreSQL

## Historical context

- [`slice-3-plan.md`](slice-3-plan.md) — concise retrospective of the durable-deployment slice and links to the documents that supersede its original plan

Historical documents must say that they are historical. Do not follow old branch names, temporary-host instructions, or superseded ingress/backup plans when current operational guides disagree.

## Repository-level guidance

- [`../README.md`](../README.md) — project overview and common commands
- [`../AGENTS.md`](../AGENTS.md) — instructions for coding agents
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — branch, validation, documentation, and safety workflow
