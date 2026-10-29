# Personal Control Center

## Product

Private personal planning and reflection PWA for one owner or a few independent invited accounts. Direct spaces support planning, reference, media, spending and weekly reflection; Inbox provides ambiguous fast capture.

## Platform

Web, phone first, with continuous laptop and desktop layouts. Installable PWA; only Capture supports offline operation.

## Stack

Existing Next.js, React, TypeScript, Tailwind and PostgreSQL. Docker Compose on Raspberry Pi, Tailscale Funnel HTTPS, independent per-user snapshots and private uploads.

## Constraints

Preserve the current application as the functional baseline, including all themes, authentication, encryption, permissions, data semantics and integrations. No destructive migration. No public registration or shared personal data. No personal information in this public repository.

## Selected work

The owner selected revised Figma Focus for phone and Atlas for desktop, with compact laptop layouts. The graph-centred Home is deferred. Implement on a new branch, supply an authenticated trial preview and draft PR, and merge only after explicit approval following real use.

## References

Product details: docs/product-spec.md. Architecture: docs/architecture.md. Functional acceptance and design anchors: docs/focus-atlas-trial.md.
