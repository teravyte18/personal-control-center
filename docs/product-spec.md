# Personal System Specification

## Problem

Important responsibilities, projects, interests, reference information, personal spending, and future plans can live across memory and disconnected tools. This creates repeated mental review, makes it harder to focus, and allows useful ideas to compete with urgent work.

## System goal

Create one private control centre that answers:

1. What matters now?
2. What requires an action or decision?
3. What can safely remain in the background?
4. What changed during the week?
5. What information should remain easy to retrieve?
6. Which external views can be recreated from canonical application data?
7. Where did personal money go, and what patterns are visible over time?

## Scope

This is a private personal system, not a commercial or collaborative product. One deployment may host a small invite-only set of independent accounts, but each account has completely separate data. Shared workspaces, teams, social features, monetisation, and growth-oriented requirements are out of scope.

The repository is public, so code, documentation, fixtures, examples, issues, and commit messages must not contain private or identifying personal information.

## System principles

- Capture first; organise later.
- Remain useful without AI or external integrations.
- Show what matters now instead of everything stored.
- Keep projects, one-off tasks, thoughts, editable notes, books, personal expenses, recurring routines, and future time-specific events conceptually distinct.
- Support reflection without turning every thought into an obligation.
- Reconstruct the review period from recorded activity so the user does not need to remember every detail.
- Make manual expense capture fast enough to happen alongside the bank notification; an occasional missed expense is acceptable and should not create a second reconciliation ritual.
- Use expense analytics to learn from already-captured data rather than adding maintenance work.
- Save long-form input without generating one server write per character.
- Design phone interactions first and progressively enhance desktop use.
- Keep external calendars as projections of application data unless a later feature explicitly defines inbound conflict handling.
- Keep Quick Capture usable through temporary connection loss without pretending the entire application works offline.
- Allow visual personality without manipulative engagement mechanics.

## Current page map

### Capture

A quiet landing page centred on one input. Online operation is visually silent. Offline, pending, syncing, retry, and failure states appear only when they affect the capture workflow.

One short greeting is selected for the browser session. Capture also shows compact Inbox and due/overdue attention where useful.

When the server cannot be reached, new captures may enter a durable device-local queue and synchronise exactly once after reconnection. A prepared installed PWA can cold-start into a dedicated Capture-only fallback.

### Inbox

The processing space for new captures. An item can be expanded, edited, assigned a supported type and area, and moved into its appropriate workflow.

Continuously edited title and context fields update immediately in the browser and persist after a short idle delay or on blur. Classification, area, dates, and the final Organise action remain discrete saves.

Inbox can create Projects, Tasks, Thoughts, Notes, and Books.

### Projects

Finite outcomes that require more than one action. Work, Education, Personal, and Uncategorised are areas within Projects; Active, In progress, Waiting, and Incubating describe lifecycle state.

A project may contain several open actions. Each action has a title and optional date. A project with no open actions becomes Waiting; adding an action returns it to Active. Completing an action can optionally create a successor, but project completion remains a separate explicit action with takeaways.

### Tasks

Concrete one-off actions that do not justify a project timeline. A task has a title, optional notes, an area, and an optional check-in date.

An undated task stays open indefinitely without an age-based warning. Recurring responsibilities belong to a future Routines space rather than Tasks. Time-specific commitments such as appointments may later belong to Events/Appointments.

### Thoughts

Observations and ideas retained without being forced into task or completion workflows. Thought cards are read-only by default, show their creation date, use an explicit Edit action, avoid routine area labels, and do not expose deletion as a normal Thoughts-page action.

### Notes

Editable reference material with a safe Markdown subset. The first line is the implicit title, cards remain compact, editing opens a complete phone-first editor, and manual ordering persists through server snapshots, exports, backups, and restores.

Notes autosave after a short idle delay and on relevant exit/blur boundaries rather than relying on a lossy Cancel flow. Formatting is stored as ordinary text and rendered through the constrained Markdown preview, so existing plain-text notes remain compatible. Notes may be created directly or from Inbox and remain distinct from Thoughts.

### Review

One top-level section with Current and History views. The current review is tied to a fixed Saturday-to-Friday period and combines generated context with structured reflection, location, an optional durable photo, and next-week focus.

Generated context includes project attention and activity, open/completed tasks, recent thoughts, and dated books started or finished during the period. Completed history entries can be expanded to read the full saved review rather than only a summary card.

### Library

A books-first personal reading space. The default **My library** view contains only books marked Owned, so a large Wishlist never clutters the normal bookshelf. Rated Owned books are ordered from highest to lowest overall score; unrated Owned books follow in title order. Reading state remains visible on the cards rather than creating separate default sections.

Wishlist is an explicit view. Wishlist books are also excluded from ordinary reading-state generated views so they do not leak into Currently reading, Finished, or Paused/abandoned.

Other generated views include Currently reading, Up next, Owned unread, Finished, and Paused/abandoned. The Library also supports title/author search, expandable filters, independent reading state/ownership/priority, optional author and edition note, optional dates, 0–10 half-step ratings, optional overall override, Thoughts and takeaways, persistent Up next ordering, optional private covers, and direct or Inbox-to-Book creation.

The first version is intentionally not a generic media catalogue.

### Expenses

A phone-first manual personal-finance space. The page opens on data rather than an entry form; a compact `+` expands Quick Add for an expense or income using amount, category, date, and optional description. Detailed expense categories map automatically to Essentials, Fun, or Future You so capture does not require duplicate classification.

The Month view derives:

- recorded income;
- ordinary spending (Essentials + Fun);
- Future You allocation;
- net cash flow;
- each bucket's share of total monthly outflows;
- fixed 50/30/20 euro reference targets derived from recorded income;
- a rolling Fun Fund for unused discretionary allowance;
- category totals;
- editable transaction history.

The 50/30/20 reference is intentionally fixed in code rather than exposed as another routine setting. Actual bucket percentages describe where that month's outflows went; the euro targets remain income-based. The Fun Fund rolls unused Fun allowance forward and floors at zero so excess Fun spending never becomes debt against later months.

The second top-level Expenses view is **Insights**, not a weekly reconciliation flow. Insights supports this month, recent 3/6-month windows, the current year, all time, and custom month ranges; category filtering; category-mix or description-level breakdowns; a donut chart; total/transaction/average metrics; and monthly trends. Selecting a category uses transaction descriptions for detail such as individual subscription names without introducing a second subcategory model.

There is deliberately no weekly bank-check workflow. The intended habit is to add transactions when the bank notification arrives and accept occasional misses rather than create recurring reconciliation work. Legacy `expenseReconciliation` snapshot state remains readable for compatibility only and is not exposed in the UI.

Expenses is online-only. Bank APIs, Open Banking, CSV import, automatic matching, autonomous categorisation, and multi-currency conversion are not part of the current boundary. See [`expenses.md`](expenses.md).

### All Spaces

A compact directory containing all implemented working spaces, Accomplishments, Archive, expandable mobile quick-access configuration, Account & access, and visible future placeholders.

### Account & access

Contains the current account and data export, sign out, per-device theme selection, optional Google Calendar connection and sync state, and owner-only invitations, revocation, and re-invitation.

## Navigation model

### Compact screens

```text
configurable | configurable | Capture | configurable | configurable
                         ↑
                    All Spaces
```

Capture is permanent in the centre. Four other slots are chosen from available pinnable spaces; the defaults are Inbox, Projects, Tasks, and Review. Thoughts, Notes, Library, and Expenses are also pinnable. Configuration is stored per browser/device. A tappable upward handle beneath Capture opens All Spaces; no hidden gesture is required.

### Larger screens

The desktop rail shows all available pinnable destinations rather than only the four mobile pins. Capture and All Spaces remain permanent.

## Core concepts

### Area

A long-lived responsibility or interest, such as Work, Education, Home, Health, Travel, or Personal Projects.

### Item

A captured record with a shared lifecycle. Items specialise into projects, tasks, thoughts, notes, and books while preserving common identity, status, area, and timestamps.

### Project

A finite outcome requiring multiple actions. Projects preserve action timelines, date-change notes, completion notes, and project takeaways.

### Task

A one-off action that does not need an action timeline. Tasks may be dated or undated and disappear from the active Tasks view after completion.

### Thought

A retained observation that should not become an obligation merely because it was recorded.

### Note

Mutable reference information with an implicit first-line title, safe Markdown formatting/preview, autosave, and manual ordering.

### Book

A Library record with independent reading state, ownership, and priority plus optional dates, 0–10 ratings, reflection, cover, and Up next order.

### Expense transaction

A user-scoped income or expense record stored as integer cents with a category, calendar date, optional description, and stable timestamps. Expense categories map to a high-level allocation bucket; income categories do not.

### Expense reconciliation compatibility marker

Older snapshots may contain `expenseReconciliation.reconciledThrough` from the original weekly-check design. It continues to normalize and round-trip safely so existing data remains compatible, but it is no longer an active product concept or exposed workflow.

### Fun Fund

A derived discretionary balance. From the selected starting month onward, each month contributes 30% of recorded income and subtracts Fun spending; the balance can roll forward but never below zero. It is not stored as a separate ledger and can be recalculated from canonical transactions.

### Event or appointment

A future time-specific commitment with a start time and potentially an end time, location, preparation context, or attendance details. It remains distinct from Tasks unless the record is genuinely an action.

### Pending offline capture

A new Capture item created while the application cannot reach the server. It remains visibly unsynchronised on that device until an idempotent server write succeeds. Pending captures are not canonical server data and must never be silently duplicated or discarded.

### Google Calendar projection

A one-way external view of dated open Tasks and dated open project actions. Personal Control Center remains canonical and can recreate the events from stored records and mappings.

### Theme preference

A browser/device preference that changes shared colour tokens, restrained line treatment, and centre Capture artwork. It does not alter data, routes, touch targets, workflows, or semantic status meaning.

### Status

Current lifecycle statuses are Inbox, Active, In progress, Waiting, Incubating, Completed, and Archived. When an item is reopened or restored, the system returns it to its meaningful previous status where possible instead of always defaulting to Active.

### Weekly Review

Each Saturday opens the immediately preceding Saturday-to-Friday period. An unfinished draft remains tied to that period through Friday, completion closes the form until the following Saturday, and a new Saturday replaces an unfinished older draft.

The review supports what happened, what went well, what felt difficult, what was learned or noticed, next-week attention, location, an optional durable photo, automatic draft persistence, and completed history. From Sunday through Friday after 08:00 local time, an unfinished review produces an in-app reminder. Browser/PWA delivery while fully closed remains best-effort and is tracked in issue #21.

## Primary workflows

- **Capture:** add an item in seconds, online or into the device-local pending queue.
- **Clarify:** expand an Inbox item and organise it into a supported workflow.
- **Plan projects:** manage several dated or undated actions, automatic Waiting, and explicit project completion.
- **Manage tasks:** create, date, reschedule, and complete one-off work without project ceremony.
- **Keep reference material:** separate autosaving Markdown-capable Notes from non-actionable Thoughts.
- **Manage reading:** use the owned-first Library, explicit Wishlist, generated views, Up next order, covers, dates, ratings, and reflections.
- **Track spending:** record expenses quickly, inspect the monthly allocation/Fun Fund view, and use filtered Insights to understand categories and descriptions over longer periods.
- **Reflect:** inspect generated Weekly Review context and complete the fixed period.
- **Project externally:** let Google Calendar reflect dated Tasks and project actions without becoming canonical.
- **Personalise:** choose theme and mobile quick-access preferences for the current device.
- **Recover:** reopen/restore work, retry pending captures, migrate earlier browser data, and restore deployment data from validated backups.

## Delivered baseline

The usable system now includes:

1. quick capture, Inbox clarification, and Capture-only offline recovery;
2. Projects with multiple open actions, automatic Waiting, history, completion, Accomplishments, and Archive;
3. standalone Tasks;
4. non-actionable Thoughts and autosaving Markdown-capable ordered Notes;
5. fixed Weekly Review periods, expanded history, photos, and reminders;
6. an owned-first books Library with explicit Wishlist, 0–10 ratings, generated views, covers, ordering, and review context;
7. Personal Expenses with low-friction manual entry, monthly allocation/Fun Fund context, editable history, and filtered Insights analytics;
8. configurable phone quick access, compact All Spaces, simplified headers, and expanded desktop navigation;
9. Default and game-named visual themes;
10. invite-only authentication and isolated multi-device persistence;
11. one-way Google Calendar projection;
12. installable PWA assets and public HTTPS ingress;
13. validated local and encrypted off-site backups.

## Current roadmap state

**No new major product slice is currently selected.** Personal Expenses, the most recently selected slice, is delivered through PR #45 with subsequent model and interface refinements in PRs #47 and #48.

The next major feature should be chosen from observed value or friction rather than promoted automatically from the candidate list. The most defined candidates are:

- **Encrypted Password Keychain** — a fully designed future candidate with a separate client-encrypted-vault threat model and staged implementation plan in [`password-keychain.md`](password-keychain.md); accepted, but explicitly not selected yet;
- **Today/Home horizon** — a focused Home-linked view for genuinely dated work due Today, Tomorrow, or two days ahead, without pressuring uncertain work to acquire invented dates;
- **photo-assisted book identification** — issue #33, only if manual title/author entry remains recurring friction;
- **Weekly Review notification observation** — issue #21, an operational observation rather than a major product slice;
- **Routines/Habits**, **Trips**, **Fitness**, or **Events/Appointments** when one becomes immediately useful;
- **optional two-way Google Calendar** — issue #26, deliberately unselected until supported record types and conflict rules are explicit;
- **advanced art-direction themes** after the existing palette/icon system has proven stable.

## Current non-goals

- native iOS or Android applications;
- social or collaboration features;
- public registration or shared spaces;
- full calendar replacement or two-way sync without explicit conflict rules;
- full offline editing of every space or general cross-device conflict resolution;
- automatic bank connections, Open Banking, or autonomous transaction categorisation;
- mandatory bank reconciliation or accounting-grade completeness;
- automatic travel booking or autonomous AI changes;
- generic task-reminder or notification-centre behaviour;
- universal media tracking, page-by-page reading progress, highlights, or ebook ingestion;
- complete routines, fitness, travel, or appointment modules;
- voice or video reviews before the written workflow proves it is needed.

## Planned specialised modules and enhancements

### Today/Home horizon

A focused view for near-term dated work, likely reached from a Home button rather than All Spaces. Candidate filters are Today, Tomorrow, and two days ahead. It should include only records with meaningful dates and must not pressure users to date uncertain work.

### Encrypted Password Keychain

A possible client-encrypted secrets vault, not plaintext records in the normal personal-data snapshot and not a claim to replace an audited password manager. Its threat model, recovery model, cryptographic boundary, and staged implementation are defined in [`password-keychain.md`](password-keychain.md). It remains a candidate until explicitly selected.

### Routines

Recurring responsibilities and practices that should not be recreated as one-off Tasks. The recurrence, completion, pause, and review model must be defined before implementation.

### Fitness

Imported activities, weekly frequency, distance, and trend summaries without requiring manual activity entry.

### Trips

Trip ideas, possible dates, budget, transport and accommodation options, decision deadlines, and supported price monitoring.

### Events or appointments

A later time-specific space for commitments that benefit from start times, end times, locations, and appointment-oriented context. It may reuse the Google Calendar connection while remaining distinct from Tasks and Projects.

### Library enhancements

Possible later additions include photo-assisted identification, external metadata lookup, page progress, quotes/highlights, or other media. Each should be selected only after actual Library use demonstrates the need.

### AI assistance

Natural-language classification suggestions, task breakdown, weekly summaries, duplicate detection, stale-project detection, and book field prefilling. Suggestions must remain optional and require user confirmation before changing stored structure.

### Advanced theme art direction

A future theme may add restrained texture, irregular borders, or decorative layers when the source has a distinctive visual language. Layout, touch areas, readability, and semantic states remain fixed.

## Success criteria

The system is useful when:

- new items can be captured in seconds from a phone, including during temporary connection loss;
- active projects expose their open actions or become Waiting automatically;
- one-off actions remain lightweight Tasks;
- Thoughts and editable Notes remain distinct;
- long-form typing remains responsive while persistence happens safely;
- Notes can use useful formatting without sacrificing plain-text compatibility or safe rendering;
- Weekly Review provides enough recorded context to avoid reconstructing the week from memory;
- books move between useful views without duplicate records or compulsory dates, and Wishlist does not clutter the normal owned bookshelf;
- personal expenses can be entered in seconds without requiring a second reconciliation habit;
- monthly spending separates ordinary consumption from Future You, preserves a clear 50/30/20 reference, and makes the rolling Fun Fund understandable;
- Insights can explain category and description patterns over useful periods without another finance data model;
- phone and desktop share canonical data while remaining isolated from other accounts;
- navigation grows without redesigning the shell;
- themes add personality without obscuring semantic state or creating engagement pressure;
- the system remains useful when integrations, notifications, and AI are unavailable;
- external Calendar events can be recreated from canonical records;
- disconnected captures survive reloads and reach the server exactly once;
- production data and private uploads can be restored from validated local and off-site backups.
