# Product Roadmap

This roadmap tracks delivered slices and the current product direction. Sequence matters more than fixed dates, and a structurally obvious feature should not outrank a workflow that is actually useful.

## Progress at a glance

```mermaid
graph LR
    S1["Slice 1<br/>Phone-first foundation<br/>✅ PR #7"]
    S2["Slice 2<br/>Actionable projects<br/>✅ PR #10"]
    S3["Slice 3<br/>Durable deployment<br/>✅ PR #13"]
    HARDEN["Hardening<br/>auth, uploads, R2<br/>✅ PR #14, #18"]
    S4["Slice 4<br/>Tasks and Weekly Review<br/>✅ PR #20, #22"]
    S5["Slice 5<br/>Google Calendar<br/>✅ PR #25"]
    S6["Slice 6<br/>Offline capture<br/>✅ PR #27"]
    EXT["Workflow extensions<br/>projects and Notes<br/>✅ PR #29, #30"]
    S7["Slice 7<br/>Book Library<br/>✅ PR #32"]
    S8["Slice 8<br/>UI and themes<br/>✅ PR #34, #35, #36"]
    S9["Slice 9<br/>Personal Expenses<br/>✅ PR #45, #47, #48"]
    S10["Slice 10<br/>Encrypted Keychain<br/>✅ PR #55, #56, #58"]
    S11["Slice 11<br/>Food v1<br/>recipe book"]
    S12["Slice 12<br/>Media Library<br/>films + series"]
    S13["Slice 13<br/>Weekly Rhythm<br/>design before build"]
    S14["Slice 14<br/>Personal Advisor v1<br/>opt-in LLM context"]

    S1 --> S2 --> S3 --> HARDEN --> S4 --> S5 --> S6 --> EXT --> S7 --> S8 --> S9 --> S10 --> S11 --> S12 --> S13 --> S14

    classDef done fill:#ecfdf5,stroke:#10b981,color:#065f46;
    classDef selected fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a;
    classDef planned fill:#f8fafc,stroke:#94a3b8,color:#334155;
    class S1,S2,S3,HARDEN,S4,S5,S6,EXT,S7,S8,S9,S10 done;
    class S11 selected;
    class S12,S13,S14 planned;
```

## Slice 1 — Phone-first foundation

**Status: complete in PR #7.**

Delivered the initial Next.js application shell, Capture, Inbox, Projects, Thoughts, Review, All Spaces, browser-local prototype persistence, basic completion, initial PWA metadata, and Docker-ready runtime.

## Slice 2 — Make projects actionable

**Status: complete in PR #10.**

Delivered shared domain actions, dated project actions with history, compact cards and full detail views, completion notes, Waiting, overdue attention, Accomplishments, recoverable Archive, and focused lifecycle tests.

The original Slice 2 planning document is now explicitly historical; later project-action changes supersede parts of its single-current-action model.

## Slice 3 — Durable personal deployment

**Status: complete in PR #13; production runs on Raspberry Pi.**

Delivered PostgreSQL canonical state, explicit browser-data migration, invite-only isolated accounts, sessions and revocation, user-scoped reads/mutations/import/export, Tailscale Funnel HTTPS, installable PWA assets, validated local backups, safe deployment/restore scripts, ARM64 production, and AMD64 CI validation.

### Deployment hardening

PR #14 added login throttling, account-enumeration timing protection, durable private review photos, paired database/upload backup and restore, production security checks, and zero-warning lint.

PR #18 added client-side encrypted Cloudflare R2/restic snapshots, retention/pruning, visible backup health, staged restore preparation, and a successful isolated restore rehearsal.

Current optional infrastructure backlog:

- repeat disaster recovery on a genuinely separate clean host periodically;
- add a second local copy on USB storage or a future NAS;
- evaluate published immutable multi-architecture images only if host build time or rollback needs justify the added release infrastructure.

## Slice 4 — Standalone Tasks and scheduled Weekly Review

**Status: complete in PR #20, with continuous-text persistence corrected in PR #22.**

Delivered dated or undated Tasks, fixed Saturday-to-Friday Review periods, generated project/task/thought context, review history, in-app reminders, best-effort browser notifications, configurable mobile quick access, and debounced long-form persistence.

PR #42 later added expandable full Review-history reading plus optimized private photo delivery with browser caching and ETag revalidation.

Real background notification behaviour remains a non-blocking observation in issue #21.

## Slice 5 — Google Calendar bridge

**Status: complete and live-tested in PR #25.**

Delivered per-user OAuth, encrypted refresh-token storage, a separate application-created calendar, one-way all-day projection, durable event mappings, duplicate-safe reconciliation, visible sync/error state, manual recovery, and clean disconnect/reconnect behaviour.

PR #29 later expanded the projection from one current project action to every dated open project action.

Two-way synchronisation remains optional future evaluation in issue #26.

## Slice 6 — Offline Quick Capture

**Status: complete and phone-tested in PR #27.**

Delivered a root-scope service worker, dedicated pre-cached Capture-only cold-start fallback, durable per-user device queues, stable client-generated IDs, duplicate-safe retry, online/offline/pending/error states, automatic recovery, and production-image checks proving the offline assets are deployed.

The boundary remains narrow: other spaces and authenticated editing remain online-only.

## Post-Slice-6 workflow extensions

### Multiple open project actions

**Status: complete in PR #29.**

Delivered parallel/sequential actions, optional dates and first actions, reschedule notes/history, automatic Active/Waiting transitions, explicit project completion with takeaways, and correct Home, Review, Calendar, import/export, backup, and restore behaviour.

### Editable Notes

**Status: complete in PR #30.**

Delivered direct and Inbox-to-Note creation, implicit first-line titles, compact two-column cards, full-screen editing, persistent phone-safe drag ordering, permanent deletion, and strict separation from Thoughts.

PR #42 later removed the lossy Cancel flow, added debounced autosave and safe Markdown formatting/preview, and kept existing plain-text storage compatible.

## Slice 7 — Book Library

**Status: complete in PR #32, with later refinements.**

Delivered an available and pinnable Library; direct and Inbox-to-Book creation; independent reading state, ownership, and priority; generated views; title/author search and expandable filters; persistent Up next ordering; optional metadata, dates, ratings, overall override, and Thoughts and takeaways; private user-scoped covers; dated reading activity in Weekly Review; and import/export/backup/restore compatibility.

PR #35 added bounded WebP display responses, private caching, and ETag revalidation while preserving original uploads.

PR #44 moved ratings from 0–5 to 0–10 with safe legacy conversion and added the one-off Amazon Library importer.

PR #48 made **My library** the default owned-only view, isolated Wishlist entries from the normal bookshelf and reading-state views, and sorted rated owned books from highest to lowest while retaining title ordering for unrated books.

Future Library enhancement issue #33 tracks photo-assisted title/author recognition after enough real use exists to judge the value.

## Slice 8 — Interface simplification and game themes

**Status: complete in PRs #34, #35, and #36.**

PR #34 documented the structural rules.

PR #35 delivered removal of the overlapping mobile Spaces button and wasted top area, a tappable dock-attached Spaces handle, compact directory rows, title-focused headers, consistent top spacing and icon treatment, silent normal online state, session-stable Home greetings, and the Library cover-delivery performance fix.

PR #36 delivered Default plus Pokémon, Hades, Hades II, Hollow Knight, Silksong, Elden Ring, Cyberpunk 2077, The Witcher 3, and Stardew Valley themes; per-browser/device persistence before first paint; shared palette/surface/accent/line tokens; theme-specific centre Capture artwork on phone and desktop; an optimised artwork sprite plus vector Poké Ball; and preservation of layout, workflows, touch targets, and semantic status meaning.

PR #42 later centralized semantic foreground and divider rules so overdue, Waiting, success, and error cards remain readable across themes.

This UI slice is complete. Future visual work should be selected independently rather than treated as unfinished acceptance criteria.

## Slice 9 — Personal Expenses

**Status: complete in PR #45, with the current model finalized through PRs #47 and #48.**

PR #45 established the manual expense/income records, detailed categories mapped to Essentials/Fun/Future You, monthly summary, editable transaction history, authenticated snapshot persistence, navigation, and the original weekly-reconciliation concept.

PR #47 refined the financial model:

- actual Essentials/Fun/Future You percentages describe shares of total monthly outflows;
- absolute euro targets remain the fixed 50/30/20 percentages of recorded income;
- the in-app target editor was removed;
- Remaining became Net cash flow;
- a rolling Fun Fund was added, with unused 30% income allowance rolling forward and the balance never carrying negative debt.

PR #48 then aligned the workflow with real use:

- Quick Add remains compact behind `+` rather than permanently occupying the page;
- the weekly bank-check workflow was removed entirely;
- the intended habit is to record from the bank notification when practical, with occasional missed entries accepted;
- Weekly check was replaced with **Insights**;
- Insights supports This month, 3 months, 6 months, This year, All time, and custom month ranges;
- Insights can filter by category, show category-mix or description-level breakdowns, render a donut summary, and show monthly trends;
- the first Fun Fund month uses the whole starting calendar month, so its first balance matches that month's Fun target minus all Fun spending.

The current boundary remains deliberately lightweight:

- EUR and online-only expense entry;
- no bank credentials, Open Banking, automatic statement matching, autonomous categorisation, or CSV import;
- no requirement for accounting-grade completeness;
- legacy reconciliation snapshot state remains readable for compatibility but is not exposed in the UI;
- expense data continues to use the normal authenticated snapshot/export/backup boundary and does not trigger Google Calendar reconciliation.

See [`expenses.md`](expenses.md) for the detailed current behaviour.

## Current selection

Slice 10 Keychain is complete. The current product direction is:

1. **Slice 11 — Food v1: personal Recipe Book** — selected next implementation slice;
2. **Slice 12 — Media Library for Films and Series** — planned after Food;
3. **Slice 13 — Weekly Rhythm** — promising direction that needs more product design before implementation;
4. **Slice 14 — Personal Advisor v1** — planned after the system has more useful lifestyle and preference context.

This sequence is based on expected daily value rather than catalogue completeness. Food can immediately reduce friction around cooking and preserving recipes worth repeating. Media remains a useful missing preference/history domain. Weekly Rhythm may later add loose structure around where and how days are spent without becoming a streak tracker. The Personal Advisor becomes more useful after these domains exist because it can reason across practical routines, food, media, projects, tasks, thoughts, reviews, and books when the user explicitly enables those domains.

Small fixes and operational observations may still land between these slices. Only Food v1 is committed as the immediate implementation slice; the later ordering can still change if real use shows a stronger need.

## Slice 10 — Encrypted Password Keychain

**Status: implementation complete in PRs #55, #56, and #58.**

PR #43 closed the design/evaluation issue and documented the accepted boundary in [`password-keychain.md`](password-keychain.md).

The implemented boundary includes:

- separate Keychain master password plus a separately stored recovery key;
- random per-user vault key wrapped client-side with an Argon2id-derived key;
- independently authenticated-encrypted records with labels, usernames, URLs, notes, and secrets hidden from the server;
- dedicated user-scoped tables and endpoints, excluded from Inbox, Notes, Review, Calendar, normal import/export, logs, and service-worker caching;
- masked values, deliberate reveal/copy, automatic re-hiding, memory-only unlock state, and fixed inactivity/background locking;
- ciphertext-only dedicated export/restore and backup behaviour;
- atomic vault-key rotation and recovery flows;
- explicit no-store/CSP/framing/referrer/permissions protections and same-origin mutation guards;
- wrong-key, tamper, rotation, restore, cross-user, and cross-origin tests plus a PostgreSQL restore rehearsal.

The implementation documents its residual boundary: a compromised browser/device or malicious application code delivered at unlock can still capture decrypted data. PR #58 completes the implementation-side hardening gate; an independent professional security review remains an optional external assurance step rather than something the implementation author can self-certify.

## Slice 11 — Food v1: Recipe Book

**Status: selected next; product boundary defined, implementation not started.**

See [`food.md`](food.md).

Food v1 is deliberately a recipe book rather than a nutrition tracker or meal-planning system. A recipe should support:

- required name;
- ingredients as multiline plain text, normally using `- item` lines;
- a one-tap **Copy ingredients** action so the text can be pasted directly into Notes as a shopping list;
- cooking steps;
- optional source URL to a website, YouTube video, Instagram post, or other reference;
- optional private photo, often the user's own photo after making the dish;
- optional servings and practical prep/cooking time;
- optional tags for retrieval;
- optional rating or make-again signal;
- optional cooking notes for substitutions, quantity adjustments, temperature changes, or lessons from previous attempts.

The first version should prioritize fast phone retrieval and editing, reuse proven private-upload and persistence patterns, and remain fully usable without external recipe services.

Explicitly deferred from v1 are nutrition tracking, weekly meal planning, Prep Sunday calculations, prepared-food inventory, pantry inventory, grocery-database behaviour, recipe scraping, AI meal generation, and routine/streak features.

Nutrition remains a future option only if it becomes useful in real use. If added later, begin with a small understandable optional set such as calories, protein, fibre, and saturated fat per serving rather than a complete nutrition label or health-scoring system.

## Slice 12 — Media Library for Films and Series

**Status: planned after Food; product boundary defined, implementation not started.**

See [`media-library.md`](media-library.md).

The first version is a lightweight personal Media space, not a general entertainment catalogue. Films and series share one top-level space and capture the preference signals that are most useful both directly and for later recommendations:

- Film or Series type;
- Wishlist, Watching, Completed, or Dropped state;
- optional 0–10 half-step rating;
- optional thoughts/takeaways;
- optional poster and start/finish dates;
- lightweight season/episode position for series.

The slice should reuse proven Book Library patterns where sensible and remain fully usable without external metadata services. Exhaustive cast, genre, provider, episode, and catalogue data is intentionally deferred.

## Slice 13 — Weekly Rhythm

**Status: direction selected for later exploration; requires more design before implementation.**

Weekly Rhythm is intentionally not a generic habit or streak tracker. The current idea is to give loose structure to days when no external schedule provides it, for example describing a day as Home, Library, Café, Flexible, Meal prep, or another useful recurring context.

Potential value includes:

- planning a few recurring out-of-home work days without scheduling every hour;
- attaching a loose main intent or context to a day;
- distinguishing intended structure from one-off Tasks or calendar Events;
- eventually giving Food useful context such as whether a meal is likely to be at home or out;
- giving the Personal Advisor better context about intended versus actual weekly patterns.

Recurrence, exceptions, completion semantics, review integration, and the boundary between Weekly Rhythm, Routines/Habits, and Events/Appointments still need brainstorming. Do not implement this slice until those rules are clearer.

## Slice 14 — Personal Advisor v1

**Status: planned after the preceding context-building slices; architecture and privacy boundary defined, implementation not started.**

See [`personal-advisor.md`](personal-advisor.md).

The Personal Advisor is a read-only, opt-in LLM layer over selected Personal Control Center domains. It is intended to make the existing spaces more useful together, not to make AI the source of truth for the system.

The first version should:

- support free-form questions plus a few useful shortcuts such as recommendations or project focus;
- allow AI access by explicit user-scoped data domain;
- build compact structured context from normal application queries;
- use ratings, completion/drop state, reflections, recency, active state, and recent history as high-value signals;
- send only relevant enabled context to a hosted model;
- explain the personal evidence behind recommendations when practical;
- avoid recommending books/media already recorded unless requested;
- remain suggestion-only with no silent mutations;
- keep provider credentials server-side and apply request-size, timeout, rate-limit, and cost controls;
- avoid storing raw generated context in logs.

Food may later become another explicit opt-in Advisor domain, using saved recipes, personal ratings/make-again decisions, and cooking notes rather than inferred health goals. Weekly Rhythm may also become an opt-in context domain once its product model exists.

**Keychain is permanently excluded from AI.** The Advisor context builder must not depend on Keychain tables, APIs, ciphertext, metadata, or decrypted client state. This must be enforced structurally rather than by telling the model not to access secrets.

Embeddings, vector search, long-term Advisor memory, autonomous agents, and generic database tools are explicitly not required for v1. Direct structured queries plus bounded recent context should be tried first. If real data volume later makes retrieval necessary, PostgreSQL plus `pgvector` is the likely incremental path.

## Other future candidates and follow-ups

### Today/Home horizon

A focused near-term view reached through a Home button rather than listed as a normal All Spaces module.

Candidate behaviour:

- Today, Tomorrow, and two-days-ahead filters;
- dated open Tasks and dated open project actions;
- no invented dates merely to make uncertain work appear;
- undated projects/actions/tasks remain valid and continue to surface through their normal spaces and Weekly Review.

This remains a useful planning-focused candidate after or between the selected direction if real use shows that near-term visibility has become more valuable than the planned work.

### Food follow-ups

After the Recipe Book has been used with real recipes, reassess:

- prepared batches/portions with made date, remaining portions, fridge/freezer location, and optional use-by date;
- a lightweight weekly meal plan that may contain a recipe, prepared portion, eating out, or nothing;
- a prep-oriented view derived from an established meal plan;
- optional nutrition metadata only if it becomes understandable and useful in practice.

Do not promote raw pantry inventory or a grocery database without observed maintenance value.

### Routines/Habits

Recurring responsibilities and practices beyond the looser Weekly Rhythm concept should wait until recurrence, completion, pause, exception, and review rules are concrete enough to avoid building a generic streak tracker.

### Events/Appointments

Time-specific commitments with start/end time, location, attendance, and preparation context. This may become the strongest reason to revisit inbound Calendar synchronisation.

### Trips

Ideas, dates, budgets, options, decision deadlines, and supported monitoring.

### Fitness

Imported activity and trend summaries without turning the app into a manual workout logger.

### Library follow-ups

Photo-assisted identification is tracked in issue #33. Metadata lookup, progress, and highlights should wait for a specific observed need. Cross-domain book/media recommendations belong to the Personal Advisor rather than being implemented as isolated Library intelligence.

### Notification observation

Issue #21 remains open for real installed-PWA behaviour when foregrounded, backgrounded, fully closed, battery-optimised, or restarted. This is an observation/validation item, not the selected next product slice.

### Optional two-way Calendar

Issue #26 remains deliberately unselected until supported record types, inbound fields, conflict rules, delivery mechanism, and failure behaviour are explicit.

### Advanced art-direction themes

A later theme may add restrained texture, painterly borders, or decorative layers—for example a Clair Obscur: Expedition 33-inspired brush treatment—without changing layout, control meaning, or semantic states.

## Product rules that continue to constrain future work

- Phone usability comes before desktop decoration.
- Personal Control Center remains useful without integrations, notifications, or AI.
- External services do not silently become canonical.
- Offline claims remain narrower than the actual supported workflow.
- New modules should enter through All Spaces and shared navigation configuration.
- Themes may add personality but not engagement pressure or ambiguous semantic states.
- Features should be selected from observed friction or value, not simply because they are common in planning apps.
- AI is advisory and opt-in by data domain; deterministic application state remains canonical.
- Keychain secrets are never part of AI context.
