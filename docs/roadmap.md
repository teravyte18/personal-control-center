# Product Roadmap

This roadmap tracks delivered slices and the current product direction. Sequence matters more than fixed dates, and a structurally obvious feature should not outrank a workflow that is actually useful.

The project is now moving out of its module-building phase. After Media v1, the default question should no longer be **“what new space should we add?”** but **“how can the information already in Personal Control Center work together?”** New standalone domains should require a clear recurring need; shared context, cross-space workflows, and useful synthesis should take priority.

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
    EXT["Workflow extensions<br/>projects and Notes<br/>✅ PR #29, #30, #61, #62"]
    S7["Slice 7<br/>Book Library<br/>✅ PR #32"]
    S8["Slice 8<br/>UI and themes<br/>✅ PR #34, #35, #36"]
    S9["Slice 9<br/>Personal Expenses<br/>✅ PR #45, #47, #48"]
    S10["Slice 10<br/>Encrypted Keychain<br/>✅ PR #55, #56, #58"]
    S11["Slice 11<br/>Food v1<br/>✅ PR #60"]
    S12["Slice 12<br/>Media Library<br/>films + series"]
    INT["Integration phase<br/>shared context<br/>+ cross-space workflows"]
    ADV["Personal Advisor v1<br/>read-only synthesis"]
    RHY["Weekly Rhythm<br/>connected planning"]

    S1 --> S2 --> S3 --> HARDEN --> S4 --> S5 --> S6 --> EXT --> S7 --> S8 --> S9 --> S10 --> S11 --> S12 --> INT --> ADV --> RHY

    classDef done fill:#ecfdf5,stroke:#10b981,color:#065f46;
    classDef selected fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a;
    classDef planned fill:#f8fafc,stroke:#94a3b8,color:#334155;
    class S1,S2,S3,HARDEN,S4,S5,S6,EXT,S7,S8,S9,S10,S11 done;
    class S12 selected;
    class INT,ADV,RHY planned;
```

## Slice 1 — Phone-first foundation

**Status: complete in PR #7.**

Delivered the initial application shell, Capture, Inbox, Projects, Thoughts, Review, All Spaces, browser-local prototype persistence, basic completion, initial PWA metadata, and Docker-ready runtime.

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

PR #42 later removed the lossy Cancel flow, added debounced autosave and safe Markdown formatting/preview, and kept existing plain-text storage compatible. PRs #50 and #51 later added preserved single line breaks and two-space nested Markdown lists.

### Project action refinements

**Status: complete in PRs #61 and #62.**

Project actions now support optional multiline Details for setup notes, bullets, commands, or other lightweight context without becoming a subtask system. Open project actions whose check-in date is today also surface on Home alongside due-today Tasks, while existing overdue behaviour remains unchanged.

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

PR #45 established manual expense/income records, detailed categories mapped to Essentials/Fun/Future You, monthly summary, editable transaction history, authenticated snapshot persistence, navigation, and the original weekly-reconciliation concept.

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

Expenses may remain relatively independent even during the integration phase. Its data can still be useful to the Personal Advisor for spending questions and broader context without creating artificial links to every other space. For example, a recipe's expected cost and an actual supermarket transaction are different facts and should not be coupled without a concrete workflow.

See [`expenses.md`](expenses.md) for the detailed current behaviour.

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

**Status: complete in PR #60.**

See [`food.md`](food.md).

Food v1 deliberately shipped as a recipe book rather than a nutrition tracker or meal-planning system. It includes:

- user-scoped recipes with required name, multiline ingredients, cooking steps, and cooking notes;
- exact **Copy ingredients** support for Notes/shopping-list reuse;
- optional source URL, private recipe photo, servings, prep/cook time, tags, 0–10 half-step rating, and make-again signal;
- search and tag filtering;
- authenticated persistence, user isolation, import/export compatibility, and normal backup/restore coverage;
- Food as an available/pinnable navigation destination.

Nutrition, weekly meal planning, Prep Sunday, prepared-food inventory, pantry/grocery tracking, recipe scraping, AI meal generation, and routine features remain intentionally deferred until real usage shows which of them are actually valuable.

The next step for Food is **use**, not immediate expansion. Real meal-prep use should tell us whether prepared portions, freezer inventory, weekly meal expectations, or other integrations deserve promotion.

## Slice 12 — Media Library for Films and Series

**Status: selected next; product boundary defined, implementation not started.**

See [`media-library.md`](media-library.md).

The first version is a lightweight personal Media space, not a general entertainment catalogue. Films and series share one top-level space and capture the preference signals that are most useful both directly and for later recommendations:

- Film or Series type;
- Wishlist, Watching, Completed, or Dropped state;
- optional 0–10 half-step rating;
- optional thoughts/takeaways;
- optional poster and start/finish dates;
- lightweight season/episode position for series.

The slice should reuse proven Book Library patterns where sensible and remain fully usable without external metadata services. Exhaustive cast, genre, provider, episode, catalogue, streaming-service, and recommendation data is intentionally deferred.

Media is currently the last clearly selected standalone domain. After it ships, product work should default to integration and synthesis unless a new module solves an observed recurring problem.

## Current selection — shift from modules to integration

The current product direction is:

1. **Slice 12 — Media Library for Films and Series** — selected next implementation slice;
2. **Integration foundation** — make existing domains expose useful, bounded context and common date/time signals without forcing direct relationships between every space;
3. **Personal Advisor v1** — use that shared context as the first major cross-space integration point for questions, summaries, recommendations, and prioritisation;
4. **Weekly Rhythm / connected planning** — design a richer planning layer using the dated and recurring information already present across Tasks, Projects, Calendar, Reviews, Food, and future routine data;
5. **Targeted cross-space workflows** — only add direct links when a real workflow benefits from them.

This is a deliberate change in product mindset. Personal Control Center already has enough useful domains that another sequence of isolated modules would increasingly resemble a collection of unrelated mini-apps. The next value comes from helping the existing data work together.

### Integration principle: shared context before hard coupling

Do not create database relationships merely because two spaces could theoretically be connected. Prefer a reusable context layer and explicit workflows.

Examples:

- Food can contribute saved recipes, ratings, make-again signals, cooking notes, and later meal expectations without directly owning expense transactions.
- Expenses can answer spending questions through the Advisor without needing links from every purchase to another domain.
- Books and Media can share recommendation context without becoming one catalogue.
- Projects, Tasks, Calendar dates, and Weekly Review history can contribute to a common view of current workload without changing their canonical ownership.
- Thoughts may later be surfaced as context or suggested for conversion into a Task, Project, or Note, but AI should not silently mutate them.

### Integration foundation

Before or alongside Personal Advisor v1, establish small reusable domain-level context representations rather than giving integrations generic database access.

Conceptually, each eligible domain should be able to expose a compact, user-scoped representation of the information another feature may need. The exact API does not need to use these names, but the shape should resemble domain-specific providers such as project context, task context, review context, food context, media context, library context, and expense context.

The foundation should support:

- explicit user/domain scope;
- bounded recent/current data rather than indiscriminate full-database dumps;
- common date/time semantics where useful;
- compact summaries plus selected details when a workflow needs them;
- deterministic application queries as the source of truth;
- reuse by Advisor, Weekly Rhythm, Home summaries, future search, or other integrations;
- no dependency on Keychain data.

A generic “LLM can query the database” tool is explicitly not the target architecture.

## Integration phase — Personal Advisor v1

**Status: architecture and privacy boundary defined; promoted to the first major integration feature after Media/context groundwork.**

See [`personal-advisor.md`](personal-advisor.md).

The Personal Advisor is a read-only, opt-in LLM layer over selected Personal Control Center domains. It is intended to demonstrate the value of combining the existing spaces rather than making AI the source of truth for the system.

Useful first-version questions include:

- what should I focus on this week?
- what active projects or commitments appear neglected?
- recommend a film, series, book, or recipe using what I actually liked or dropped;
- what should I cook this weekend from recipes I already saved?
- what has changed or stood out over the last week or month?
- what patterns keep appearing in Weekly Reviews or Thoughts?
- what have I been spending most on recently?
- if I have a free block of time, what existing plans, saved media, books, or tasks make sense?

The first version should:

- support free-form questions plus a few useful shortcuts such as recommendations, recap, or project focus;
- allow AI access by explicit user-scoped data domain;
- build compact structured context through the shared context layer;
- use ratings, completion/drop state, reflections, recency, active state, dates, and recent history as high-value signals;
- send only relevant enabled context to a hosted model;
- explain the personal evidence behind recommendations when practical;
- avoid recommending books/media already recorded unless requested;
- remain suggestion-only with no silent mutations;
- keep provider credentials server-side and apply request-size, timeout, rate-limit, and cost controls;
- avoid storing raw generated context in logs.

**Keychain is permanently excluded from AI.** The Advisor context builder must not depend on Keychain tables, APIs, ciphertext, metadata, or decrypted client state. This must be enforced structurally rather than by telling the model not to access secrets.

Embeddings, vector search, long-term Advisor memory, autonomous agents, and generic database tools are explicitly not required for v1. Direct structured queries plus bounded recent context should be tried first. If real data volume later makes retrieval necessary, PostgreSQL plus `pgvector` is the likely incremental path.

## Integration phase — Weekly Rhythm and connected planning

**Status: direction selected for later exploration; requires product design before implementation.**

Weekly Rhythm should evolve from the earlier loose Home/Library/Café idea into a connected model of **the expected shape of a week**. It remains intentionally different from a generic habit or streak tracker and should not become an hour-by-hour scheduling system.

Potential inputs include:

- Google Calendar events and future Events/Appointments if that domain is added;
- dated Tasks and project actions;
- Weekly Review context and recent workload;
- recurring work/study commitments;
- training or other routine days;
- preferred working locations or day types such as Home, Library, Café, Flexible, or Meal prep;
- expected at-home versus out-of-home meals and later Food planning context;
- exceptions for unusually busy, free, travel, or recovery days.

Potential value includes:

- seeing which days are already structurally busy before adding more work;
- varying expected workload by day rather than pretending every day has equal capacity;
- planning recurring out-of-home work or training without creating repetitive Tasks;
- connecting meal-prep or expected meals to the Food domain without turning Food itself into a calendar;
- distinguishing intended weekly structure from one-off Tasks and appointments;
- giving the Personal Advisor better context about intended versus actual weekly patterns.

Recurrence, exceptions, completion semantics, Calendar ownership, review integration, meal planning, and the boundary between Weekly Rhythm, Routines/Habits, and Events/Appointments still need brainstorming. Do not implement this as a generic routine tracker merely to fill those gaps.

## Targeted cross-space integrations

After the shared context layer exists, direct cross-space behaviour should be added only when it removes real friction. Plausible examples include:

- Food → expected meal or meal-prep block → Weekly Rhythm;
- Media → current watching / “watch tonight” context → Advisor;
- Library → current reading / Up next → Advisor;
- Project actions and Tasks → Home, Calendar, Advisor, and Weekly Rhythm;
- Weekly Review → Advisor recaps and pattern detection;
- Thoughts → Advisor context and explicit user-approved conversion suggestions;
- Expenses → Advisor financial summaries while otherwise remaining largely standalone.

These are examples rather than commitments. Shared context does not require every domain to be directly connected to every other domain.

## Other future candidates and follow-ups

### Today/Home horizon

A focused near-term view reached through a Home button rather than listed as a normal All Spaces module.

Candidate behaviour:

- Today, Tomorrow, and two-days-ahead filters;
- dated open Tasks and dated open project actions;
- later, relevant calendar/rhythm context if that improves the view;
- no invented dates merely to make uncertain work appear;
- undated projects/actions/tasks remain valid and continue to surface through their normal spaces and Weekly Review.

This may become more naturally useful as part of the integration phase rather than as another standalone destination.

### Food follow-ups

After the Recipe Book has been used with real recipes, reassess:

- prepared batches/portions with made date, remaining portions, fridge/freezer location, and optional use-by date;
- a lightweight weekly meal expectation/plan that may contain a recipe, prepared portion, eating out, or nothing;
- a prep-oriented view derived from an established meal plan;
- integration with Weekly Rhythm when meal-at-home versus meal-out context proves useful;
- optional nutrition metadata only if it becomes understandable and useful in practice.

Do not promote raw pantry inventory, a grocery database, or theoretical recipe-to-expense accounting without observed maintenance value.

### Routines/Habits

Recurring responsibilities and practices should be considered as inputs to Weekly Rhythm rather than automatically becoming their own space. Recurrence, completion, pause, exception, and review rules must be concrete enough to avoid building a generic streak tracker.

### Events/Appointments

Time-specific commitments with start/end time, location, attendance, and preparation context. This may become the strongest reason to revisit inbound Calendar synchronisation and a useful Weekly Rhythm input.

### Trips

Ideas, dates, budgets, options, decision deadlines, and supported monitoring. Prefer integration with existing dates, Expenses, Tasks, or Advisor context over immediately creating a large travel-management module.

### Fitness

Imported activity and trend summaries without turning the app into a manual workout logger. Recurring training days may be useful Weekly Rhythm inputs before a dedicated Fitness space is justified.

### Library follow-ups

Photo-assisted identification is tracked in issue #33. Metadata lookup, progress, and highlights should wait for a specific observed need. Cross-domain book/media recommendations belong to the Personal Advisor rather than being implemented as isolated Library intelligence.

### Notification observation

Issue #21 remains open for real installed-PWA behaviour when foregrounded, backgrounded, fully closed, battery-optimised, or restarted. This is an observation/validation item, not the selected next product work.

### Optional two-way Calendar

Issue #26 remains deliberately unselected until supported record types, inbound fields, conflict rules, delivery mechanism, and failure behaviour are explicit. Weekly Rhythm or a future Events/Appointments model may provide a clearer reason to revisit it.

### Advanced art-direction themes

A later theme may add restrained texture, painterly borders, or decorative layers—for example a Clair Obscur: Expedition 33-inspired brush treatment—without changing layout, control meaning, or semantic states.

## Product rules that continue to constrain future work

- Phone usability comes before desktop decoration.
- Personal Control Center remains useful without integrations, notifications, or AI.
- External services do not silently become canonical.
- Offline claims remain narrower than the actual supported workflow.
- New modules should enter through All Spaces and shared navigation configuration.
- After Media, prefer integrating existing domains over adding new spaces unless observed use clearly justifies another module.
- Shared context should come before hard coupling; do not invent cross-domain relationships without a useful workflow.
- Domain-specific context providers are preferred over generic database access for integrations and AI.
- Themes may add personality but not engagement pressure or ambiguous semantic states.
- Features should be selected from observed friction or value, not simply because they are common in planning apps.
- AI is advisory and opt-in by data domain; deterministic application state remains canonical.
- Keychain secrets are never part of AI context.