# Personal System Specification

## Problem

Important responsibilities, projects, interests, reference information, personal spending, media history, food ideas, and future plans can live across memory and disconnected tools. This creates repeated mental review, makes it harder to focus, and allows useful information to compete with urgent work.

## System goal

Create one private control centre that helps answer:

1. What matters now?
2. What requires an action or decision?
3. What can safely remain in the background?
4. What changed during the week?
5. What information should remain easy to retrieve?
6. Which external views can be recreated from canonical application data?
7. Where did personal money go, and what patterns are visible over time?
8. How can information already stored in separate PCC domains work together without turning the product into one giant generic database?

## Scope

Personal Control Center is a private personal system, not a commercial or collaborative product.

One deployment may host a small invite-only set of independent accounts, but each account has separate data. Shared workspaces, social features, monetisation, growth-oriented requirements, and public registration are out of scope.

The repository is public. Code, documentation, fixtures, examples, issues, and commit messages must not contain private or identifying personal information.

## System principles

- Capture quickly; organise only when needed. Direct placement into the right space is preferred when the destination is already obvious; Inbox remains a fallback for ambiguous or time-critical capture.
- Remain useful without AI or external integrations.
- Show what matters now instead of everything stored.
- Keep Projects, Tasks, Thoughts, Notes, Library records, Expenses, Food, Keychain secrets, recurring routines, and future time-specific events conceptually distinct.
- Support reflection without turning every thought into an obligation.
- Reconstruct the Weekly Review period from recorded activity instead of relying on memory alone.
- Save long-form input without generating one server write per character.
- Design phone interactions first and progressively enhance desktop use.
- Keep external Calendar events as projections of PCC data unless a later feature explicitly defines inbound ownership/conflict handling.
- Keep Quick Capture usable through temporary connection loss without pretending the entire application is offline-first.
- Allow visual personality without manipulative engagement mechanics.
- Prefer observed friction and real use over speculative feature completeness.
- After the main module-building phase, prefer coherent context and targeted integration over adding more isolated spaces.
- Keep deterministic application state canonical.
- Treat AI as experimental/advisory until repeated value is demonstrated.
- Keep Keychain secrets outside every AI/context path by construction.

## Current page map

### Capture / Home

Home remains centred on fast Capture, but the selected refresh combines Capture with a concrete near-term Today surface.

Online operation is visually silent. Offline, pending, syncing, retry, and failure states appear only when they matter.

Today should show actual overdue/due Tasks and Project Actions rather than stacking generic warning summaries. Undated work remains valid and is not forced into Today. Wide desktop may place Capture and Today beside each other; phone keeps a stacked flow. Inbox attention remains compact.

When the server cannot be reached, new captures may enter a durable device-local queue and synchronise exactly once after reconnection. A prepared installed PWA can cold-start into a dedicated Capture-only fallback.

### Inbox

The processing space for new captures.

Items can be expanded, edited, assigned a supported type/area, and moved into their appropriate workflow. Continuously edited text persists after an idle delay or on relevant blur/exit boundaries rather than one request per character.

Inbox can create Projects, Tasks, Thoughts, Notes, and Books.

### Projects

Finite outcomes that require more than one action.

Projects may contain several independently open actions. Each action has a title, optional Details, and optional check-in date. A project with no open actions becomes Waiting; adding an action reactivates it.

Completed/rescheduled actions retain their history. Completing one action never completes the project implicitly. Project completion remains an explicit action with takeaways.

### Tasks

Concrete one-off actions that do not justify a project timeline.

A Task has a title, optional notes, area, and optional check-in date. Undated Tasks remain valid and do not receive arbitrary age-based warnings.

### Thoughts

Observations and ideas retained without being forced into task/completion workflows.

Thoughts remain distinct from editable Notes and are not automatically converted into obligations.

### Notes

Editable reference material with a constrained Markdown subset.

The first line is the implicit title. Notes autosave, support useful formatting and two-space nested lists, preserve manual ordering, and remain separate from Thoughts throughout Inbox organisation, export, backup, and restore.

### Review

One top-level section with Current and History views.

The current review is tied to a fixed Saturday-to-Friday period and combines generated context with structured reflection, location, optional private photo, and next-week focus.

Generated context includes project attention/activity, open/completed Tasks, recent Thoughts, and dated Book activity. Completed reviews remain expandable in History.

### Library

Library is one umbrella space with first-level **Books | Movies | Series** shelves.

The unified navigation does not force the three media types into one generic schema.

#### Books

Books retain the existing books-first model:

- Owned/My library default view;
- Wishlist isolated from the normal bookshelf;
- Currently reading, Up next, Owned unread, Finished, and Paused/abandoned views;
- independent reading state, ownership, and priority;
- optional dates, 0–10 ratings, reflections, edition note, cover, and Up next ordering.

#### Movies

Movies support:

- Wishlist, Watching, Completed, or Dropped state;
- optional 0–10 rating;
- optional thoughts;
- one optional Watched on date;
- optional private poster.

Separate start/finish dates are deliberately unnecessary for the normal movie workflow.

#### Series

Series support:

- Wishlist, Watching, Completed, or Dropped state;
- optional 0–10 rating;
- optional thoughts;
- optional start/finish dates;
- optional private poster;
- optional current season/episode resume position.

Series opens on Watching by default because preserving resume position is a high-value day-to-day use.

Historical Media completeness is not required; current/future viewing can accumulate naturally.

### Food

Food v1 is a Recipe Book, not a nutrition tracker or meal-planning system.

Recipes support required name, ingredients, cooking steps, and cooking notes plus optional source URL, private photo, servings, prep/cook time, tags, 0–10 rating, and make-again state.

Copy ingredients supports lightweight shopping-list reuse without requiring a grocery database.

Prepared portions, freezer inventory, weekly meal planning, Prep Sunday, pantry tracking, nutrition, and AI meal generation remain deferred until real use proves value.

### Expenses

A phone-first manual personal-finance space.

Quick Add records expense/income amount, category, date, and optional description. Expense categories map to Essentials/Fun/Future You.

The Month view derives recorded income, ordinary spending, Future You allocation, net cash flow, bucket shares, fixed 50/30/20 euro reference targets, rolling Fun Fund, category totals, and editable history.

Insights supports useful date ranges, category filtering, category/description breakdowns, summary metrics, donut visualisation, and monthly trends.

There is deliberately no weekly bank-reconciliation ritual. Occasional missed entries are acceptable.

Expenses remains online-only and does not use bank credentials/Open Banking/automatic matching/autonomous categorisation.

### Keychain

The encrypted Keychain is a separate secrets boundary rather than ordinary PCC item data.

Secrets are encrypted/decrypted client-side, stored through dedicated tables/APIs, protected by a separate master/recovery model, and excluded from normal Inbox/Notes/Review/Calendar/import/export behaviour.

Only ciphertext participates in its dedicated backup/export flows. Keychain data is never eligible for AI/context integrations.

### All Spaces

The complete launcher for implemented spaces, Accomplishments, Archive, account/access controls, navigation preferences, and selected future/experimental destinations when appropriate.

The selected refresh groups destinations by purpose and uses denser phone presentation so All Spaces can scale without making every module permanent global navigation.

### Account & access

Contains account/data export, sign out, per-device theme selection, optional Google Calendar connection/sync state, and owner-only account invitation/revocation controls.

## Navigation model

### Compact screens

```text
configurable | configurable | Capture | configurable | configurable
                         ↑
                    All Spaces
```

Capture is permanent in the centre. Four other slots are configurable from available pinnable spaces. Configuration is device-local.

### Larger screens

The target desktop rail keeps Capture and All Spaces permanent and shows a bounded configurable set of pinned destinations. The primary rail must not become a scrollable inventory of every implemented module.

## Core concepts

### Item

A captured record with shared identity/lifecycle fields. Projects, Tasks, Thoughts, Notes, and structured records reuse common personal-data storage where appropriate while preserving domain-specific behaviour.

### Project action

A lightweight next/action point belonging to a Project, with title, optional Details, optional date, status/history, and optional reschedule notes.

### Weekly Review

A fixed-period reflection record backed by generated deterministic context plus user-written reflection. It remains canonical PCC data rather than an AI summary.

### Library records

Books, Movies, and Series are browsed together under Library but retain domain-specific models/state where useful.

### Expense transaction

A user-scoped income/expense record stored as canonical server data with category, date, optional description, amount, and stable timestamps.

### Fun Fund

A derived discretionary balance: each month contributes 30% of recorded income and subtracts Fun spending, rolling forward but flooring at zero.

### Pending offline capture

A device-local new capture waiting for an idempotent server write. It is not canonical until the server confirms it.

### Google Calendar projection

A one-way external view of dated open Tasks and dated open project actions. PCC remains canonical and can recreate those events.

### Personal Context Layer

An implemented reusable integration boundary that exposes compact, bounded, user-scoped representations of explicitly selected PCC domains.

The current eligible domains are Projects, Tasks, Weekly Reviews, Weekly Rhythm, Thoughts, Notes, Library, Food, and Expenses. The layer is deterministic and read-only, preserves useful record identity, applies bounded record/recency/text limits, and is usable by non-AI cross-space features.

Weekly Review context is intentionally rich: the current draft plus bounded recent completed reviews expose period dates and the reflective fields for what happened, what went well, what was difficult, what was learned, and what should change next. This makes Review one of the strongest longitudinal inputs for later cross-space reflection or Advisor experiments.

The authenticated Context Inspector at `/spaces/context` makes the exact generated representation visible during development. Keychain is structurally excluded from the context domain model and endpoint.

It is not a generic database API for models.

### LLM experiment

A future optional sandbox for learning/testing personalised LLM behavior against the Personal Context Layer. It is not currently a committed normal user-facing Advisor space.

## Primary workflows

- **Capture:** add something in seconds, including through temporary connection loss.
- **Clarify:** organise Inbox records into the appropriate domain.
- **Plan projects:** manage multiple open actions, Waiting, dates, Details, history, and explicit completion.
- **Manage tasks:** create, date, reschedule, and complete one-off work without project ceremony.
- **Keep reference material:** use Notes without forcing information into Thoughts/Tasks.
- **Reflect:** complete Weekly Review with generated context and saved history.
- **Track media:** maintain Books/Movies/Series state, ratings, progress, and optional reflection without exhaustive catalogue work.
- **Keep recipes:** save repeatable cooking knowledge without prematurely building a full food-management system.
- **Track spending:** capture transactions quickly and analyse already-recorded data without a reconciliation ritual.
- **Protect secrets:** keep encrypted Keychain data in its own hardened boundary.
- **Project externally:** let Google Calendar reflect dated canonical work.
- **Personalise:** choose theme and mobile quick-access preferences per device.
- **Recover:** restore canonical data and private uploads from validated backup paths.

## Delivered baseline

The usable system now includes:

1. quick Capture, Inbox clarification, and Capture-only offline recovery;
2. Projects with multiple open actions, Details, Waiting, history, completion, Accomplishments, and Archive;
3. standalone Tasks;
4. Thoughts plus autosaving Markdown-capable ordered Notes;
5. fixed Weekly Review periods, History, photos, and reminders;
6. unified Library with Books, Movies, and Series;
7. Food v1 Recipe Book;
8. Personal Expenses with Month/Fun Fund and Insights;
9. client-encrypted Keychain with dedicated security/backup boundaries;
10. configurable phone quick access, compact All Spaces, and desktop navigation;
11. Default and game-inspired themes;
12. invite-only authentication and isolated multi-device persistence;
13. one-way Google Calendar projection;
14. installable PWA assets and public HTTPS ingress;
15. validated local and encrypted off-site backups;
16. a bounded Personal Context Layer plus authenticated Context Inspector for deliberate cross-space integration.

## Current roadmap state

The module-building sequence through Media is complete, the broad UI/UX consolidation has shipped, the Personal Context Layer plus Context Inspector are implemented, the real-use audit is documented, and the **Weekly Rhythm MVP is implemented in PR #79**.

The current direction is:

1. **Combined Context + Rhythm real-use test** — continue testing before expanding the planning surface;
2. **Home / Agenda integration** — if Rhythm proves useful, use its weekly horizon plus Calendar context to improve visibility while leaving detailed calendar browsing to Google Calendar;
3. **Context Retrieval Foundation** — project eligible full-history records into retrieval documents, add deterministic search, and add a question-driven Resolved Context Inspector;
4. **Context Planner experiment** — test a provider-neutral structured model step that chooses domains/searches without seeing the whole archive;
5. **Hybrid retrieval + LLM sandbox** — add semantic retrieval only where useful, then test final conversational answers using inspectable resolved context;
6. **Memory experiments** — episodic summaries and provenance-aware stable memory only after retrieval value is proven;
7. **Evaluate from real usage** — promote an Advisor, external-assistant connector, local model workflow, or model-assisted actions only if repeated value appears.

The usage evidence behind this choice is recorded in [`usage-audit-2026-10.md`](usage-audit-2026-10.md), and the implemented Rhythm model is documented in [`weekly-rhythm.md`](weekly-rhythm.md).

A polished Personal Advisor is **not currently a committed next feature**.

See [`roadmap.md`](roadmap.md) and [`personal-advisor.md`](personal-advisor.md).

## Integration principle

Prefer **shared context before hard coupling**.

Do not create database relationships just because two domains could theoretically interact.

The Personal Context Layer exposes deliberate representations for Projects, Tasks, Reviews, Rhythm, Thoughts, Notes, Library, Food, and bounded Expenses context. New domains should be added only for a concrete cross-space consumer.

These bounded representations are **active-context outputs**, not the complete future retrieval universe. Older eligible Reviews, Library records, Notes, Thoughts, and other retained history should remain searchable even after they fall outside default record/recency limits.

Important rules:

- authenticated user scope;
- explicit domain selection;
- bounded current/recent history;
- deterministic source data;
- stable identity where grounding matters;
- sparse/missing data is not negative evidence;
- no Keychain dependency;
- reusable by AI and non-AI features.

## AI / personalisation direction

The AI work has two goals:

1. investigate whether coherent PCC context enables conversations/interactions that are materially better than ordinary deterministic views or manually providing context to ChatGPT;
2. use PCC as a hands-on environment for learning API authentication/billing, models, reasoning effort, tokens/cost, context engineering, memory, tools, privacy, and provider trade-offs.

The first experiment should be deliberately inspectable and cheap rather than disguised as a finished assistant.

Interesting conversations may include discussing a finished book, comparing a later reading experience with an older reflection, reconsidering a Weekly Review conclusion, or talking through a decision while the relevant PCC context is available.

A recommendation engine alone is not the target product.

### Retrieval and memory direction

If long-term conversational continuity is explored, do not replay an ever-growing raw transcript and do not solve it by continually increasing Context limits.

Separate:

- canonical PCC archive;
- a searchable retrieval corpus over eligible retained history;
- fresh/current state selected deterministically;
- recent conversation turns;
- retrieved old canonical records relevant to the current question;
- episodic summaries for dense historical material;
- compact stable personal memory with provenance.

The future resolver should search first and apply record/token limits **after ranking**. A Library item or Review can therefore remain discoverable years later without being present in every request.

PCC should own retrieval documents, summaries, and stable memory so a later model/provider can consume the same history.

See [`context-retrieval-memory.md`](context-retrieval-memory.md).

### Write direction

Initial experiments remain read-only.

Future explicit actions may be useful, such as rescheduling work or saving a generated shopping list, but only through a specific structured proposal shown to the user and explicitly confirmed through normal deterministic PCC mutations.

No unrestricted database write tool is allowed.

### Promotion gate

AI should become a polished PCC feature only if repeated real use proves value beyond:

- normal deterministic PCC views;
- occasional one-off recommendations;
- ordinary ChatGPT with manually supplied context.

Otherwise the experiment may remain internal, be removed, or become a PCC-to-external-assistant connector instead.

## Current non-goals

- native iOS/Android applications;
- social/collaboration features;
- public registration or shared workspaces;
- full Calendar replacement or two-way sync without explicit conflict rules;
- general full offline editing/conflict resolution;
- automatic bank connections/Open Banking/autonomous transaction categorisation;
- accounting-grade expense completeness;
- exhaustive public media cataloguing, streaming-provider tracking, or episode-by-episode history;
- mandatory page-by-page reading progress/highlight ingestion;
- complete pantry/grocery/nutrition management without observed need;
- generic habit/streak mechanics; Weekly Rhythm may track flexible weekly targets, but not daily streak pressure;
- autonomous AI agents;
- blanket database access for models;
- Keychain access by AI/context systems;
- proactive periodic LLM polling merely to create the appearance of intelligence;
- silent AI-created Tasks, Thoughts, Notes, Calendar changes, purchases, bookings, or messages;
- AI becoming canonical application state.

## Future candidates

These remain candidates rather than selected commitments:

- near-term Today/Tomorrow horizon reached from Home;
- Events/Appointments;
- richer recurrence semantics only after the Weekly Rhythm MVP proves that simple weekly targets are insufficient;
- Trips;
- imported Fitness/activity summaries;
- Food meal-prep/freezer/weekly-meal extensions after real Recipe Book use;
- **Library comic/sequential-work support inside Books**: optional comic type/toggle, Physical/Digital/Both format, current issue/resume position, and lightweight tolerant issues-read ranges; do not require issue-by-issue catalogue completeness;
- optional inbound/two-way Calendar when ownership/conflict rules are clear;
- advanced theme art direction.

## Success criteria

The system is useful when:

- new items can be captured in seconds from a phone, including through temporary connection loss;
- Projects expose actionable next work without forcing every action to have a date;
- one-off Tasks remain lightweight;
- Thoughts and editable Notes remain distinct;
- long-form typing remains responsive while persistence happens safely;
- Weekly Review provides enough recorded context to reduce reconstruction from memory;
- Library lets Books, Movies, and Series remain useful without exhaustive metadata/backfilling;
- Series progress prevents losing resume position across long breaks;
- Food stores recipes worth making again without becoming maintenance-heavy;
- expenses can be entered quickly and analysed without a second checking ritual;
- Keychain secrets remain isolated from ordinary PCC state and all AI/context paths;
- phone and desktop share canonical personal data while accounts remain isolated;
- Calendar events can be recreated from canonical dated records;
- backups can restore canonical data and private uploads;
- navigation can grow without redesigning the shell;
- themes add personality without obscuring semantic state;
- the system remains useful when integrations, notifications, and AI are unavailable;
- future integrations consume deliberate bounded context rather than arbitrary database access;
- experimental AI costs and data exposure remain visible and controlled;
- no AI feature is promoted simply because the underlying API works.
