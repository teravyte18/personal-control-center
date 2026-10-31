# UI polish P3 — proposed, not implemented

Updated 30 October 2026. P1 (#103) and P2 (#105) are merged into main. Their delivered scope and validation limits are recorded in [the polish changelog](ui-polish-2026.md). This document defines remaining work and acceptance criteria; it does not claim implementation, testing, deployment, or approval of a new visual direction.

P3 is the next delivery batch, not a low-severity classification. The [earlier audit backlog](ui-ux-audit-2026-10-backlog.csv) uses independent P1/P2 severity labels. Do not close those findings solely because a similarly named delivery phase merged.

## Start from the current UI

Inspect the actual merged revision on phone and desktop before changing it again. Record the tested commit, viewport, theme, scenario and result. Keep private screenshots and identifying records outside the public repository; commit only fictional reproductions and sanitized findings.

P1 already supplies grouping, icons, expense padding, task completion controls and a compact five-item phone dock with Capture centred. All Spaces is in the phone header; Account remains reachable there. P2 already supplies Library sort modes/direct editor navigation, earlier Music rankings, Home commitments, exact action links and dated-focus deduplication. Preserve these behaviors while assessing the remaining gaps.

## Proposed implementation slices

Each slice can become a focused PR after inspecting the current behavior. The order below is a suggested implementation sequence, not a commitment to implement every candidate at once.

### 1. Home and Week: clarify the planning horizon

**Remaining problem:** Home's near-term dated work, Week's undated selected work and Calendar commitments represent different scopes. P2 removes duplicate dated focus rows but does not establish a unified Home/Capture information architecture or guarantee that useful weekly work and constraints appear early on a small screen.

**Proposed work:** make the distinction between dated work and selected weekly focus explicit; assess a compact route to undated focus from Home; review mobile ordering with many rhythms. Balance Capture, chosen work and commitments using actual tasks. Do not introduce the deferred graph Home or remove fast capture as part of this polish.

**Acceptance:**

- With zero, two and eight rhythms, phone readers can identify selected work and upcoming constraints without confusing habit progress with dated commitments.
- A selected undated task is discoverable from Home or its exclusion is clear; empty states never imply that no weekly work exists merely because none is dated.
- A dated selected action appears once in Week, retains its focus label and removal control, and opens the exact source.
- Desktop columns improve scan order without changing semantic/keyboard order. Capture and work remain usable at 320px and with enlarged text.

### 2. Calendar: coverage, freshness and ownership

**Remaining problem:** P2 adds native source links and Home commitments, but a successful/empty fetch does not communicate all coverage or freshness limits. The broader role of Agenda relative to Week and Google Calendar is still a product decision.

**Proposed work:** distinguish disconnected, reconnect-required, loading, failed, partial-coverage and stale-result states where Calendar is used. Choose a useful week-to-upcoming path. Review whether Agenda should remain, simplify or redirect only after identifying a home for every unique job.

**Acceptance:**

- An empty result never claims the user is free; coverage limits and failed/stale reads are distinguishable without visiting Account.
- External events lead to their external owner; PCC Task/Project Action projections lead to the exact canonical record. Missing/completed sources have a recoverable explanation rather than an apparently unrelated view.
- Agenda creation/editing/deletion, meeting links, calendar selection and later-event browsing remain reachable if the layout changes.
- No silent change to OAuth scopes, app-owned calendar classification, read-only external events or one-way projection ownership. Any ownership change needs a separate explicit design and implementation scope.

### 3. Library: reading access and compact controls

**Remaining problem:** P2 removes the duplicate desktop preview and adds sorting, but cards still open the comprehensive editor. A lightweight reading/takeaway/progress flow has not been implemented. Mobile control density still needs visual acceptance.

**Proposed work:** assess a compact reading/detail view with a clear route to the full editor; make the main reading/progress update easy without forcing unrelated field traversal. Review search, shelf, sort, filters and view controls together on narrow screens.

**Acceptance:**

- Read a takeaway or update the main reading/progress state without traversing unrelated editing fields; complete editing, cancel, covers and deletion remain available.
- Preserve comic/sequential-work progress, independent ratings, zero versus unrated, Wishlist separation and the manually ordered Up next queue.
- Closing returns to the invoking card with shelf/search/sort position preserved; keyboard focus remains contained in an open editor and returns predictably.
- Titles, author names, controls and covers fit phone/enlarged text and desktop. Do not add another always-visible duplicate preview panel.

### 4. Music: recoverable state and accessible feedback

**Remaining problem:** P2 changes content order and period sizing, but view-state recovery and assistive-technology feedback were not completed or certified.

**Proposed work:** define and implement the navigation contract for mode, period and expansion state, preferably with valid shareable/recoverable URL parameters; add appropriate asynchronous announcements and expansion semantics.

**Acceptance:**

- Select a historical month/year, navigate away and return: the documented state is restored. Invalid URL parameters fall back safely.
- Period changes announce loading and result/error once without moving focus away from the selected control. Empty results and fetch errors remain distinct.
- Expand/collapse controls expose their state and identify the affected list; long titles, low genre coverage and unknown-duration notices remain understandable.
- On phone the period, listening summary and beginning of rankings are reachable without secondary panels dominating; desktop rankings use space coherently. Verify rather than assume the native month input fits across browsers.

### 5. Expenses and shared interaction clarity

**Remaining problem:** Padding and spending-share labels landed in P1. They do not settle the distinction between absent income, genuine zero income and an exceeded reference target, or explain every Insights average denominator. The shared copy/state pass is incomplete.

**Proposed work:** communicate the available income baseline honestly and explain which months contribute to averages. Review repeated action names, expansion state, target sizes, save feedback and return navigation across planning, Notes and Review.

**Acceptance:**

- Missing income, actual zero income and positive-income examples are understandable without changing the fixed allocation rules or calculations silently. If the data model cannot distinguish cases, state that limitation or scope the necessary model change separately.
- For one populated month in a longer range, explain the average denominator. Do not equate unknown recording coverage, true zero months and a partial current month.
- Repeated Edit/Remove/Manage controls identify their object; expanded states are exposed programmatically. Saving feedback never conceals failed or pending persistence.
- Do not alter canonical domain actions, autosave behavior or financial math as an incidental presentation change.

## Visual and accessibility acceptance gate

This is outstanding work, not certification inherited from green CI. Fix verified issues in the smallest relevant slice and record remaining limits.

| Environment | Required checks |
| --- | --- |
| Narrow and ordinary phone | 320px and approximately 390px widths; no horizontal overflow; long titles and enlarged text; final row clears dock; five configured dock positions and centred Capture remain usable |
| Physical phone / software keyboard | Task/project forms, date controls, submit/cancel, dismissal and rotation; focused fields remain visible; dock returns after editing; test fallback behavior without Visual Viewport support |
| Laptop and wide desktop | Rail breakpoints, chronological Agenda order, Week reading order, full-width Library/Music, appropriate density and predictable editor return |
| Keyboard and assistive technology | Complete main flows without pointer; visible focus, modal containment/return, real checkboxes, named actions, expansion semantics and async announcements; screen-reader pass with an identified browser/tool |
| Themes and contrast | Every retained palette: normal text at least 4.5:1, large text at least 3:1, relevant non-text controls/focus at least 3:1; preserve semantic danger/waiting/success/disabled meaning and forced-colours usability |
| Data and integration states | Fictional empty/long lists, no Calendar, failed/reconnect/partial/stale Calendar, no income, zero/unrated ratings, missing source links, offline capture and failed saves |

Automated geometry/domain tests support these checks but do not prove visual quality, screen-reader usability or physical-keyboard behavior. Do not mark P3 complete solely because lint, tests and build pass. Record what was actually inspected and what remains untested.

## Parallel-work handoff

This plan is safe to discuss while another agent implements unrelated work. Before starting a slice:

1. Fetch current main and inspect the current PRs and local changes; a merged PR or this document is not proof of what is deployed.
2. Use a dedicated `agent/<description>` branch and separate worktree. Declare the slice and files being changed in its PR; coordinate overlapping edits rather than resetting or overwriting another agent's work.
3. Keep code PRs small, with shared domain mutations, authenticated/user-scoped reads and existing recovery boundaries intact. Do not commit private evidence.
4. Update this plan and the relevant feature guide with delivered behavior, checks and remaining limits. Run checks appropriate to the implementation; documentation-only updates need link/diff/content checks rather than a new runtime certification.
5. Merge only through the owner's normal review process. Deploy only within separately authorized scope; no data restore or volume deletion is needed for a UI rollback.

No P3 code is included in the documentation update that introduces this plan. Figma changes are optional design work, not a prerequisite or an implied completed deliverable. Broader AI/Advisor, new integrations and new spaces remain outside this UI-polish plan.
