# PCC UI/UX audit — installed-skills reassessment

**Run:** 20 October 2026. **Status:** recommendations for review; documentation only. **Scope change:** visual identity is open for reconsideration. This report supersedes the earlier conservative audit in this PR; the current product and interface guides still describe deployed behavior.

## Verdict

**A broader redesign is worth exploring. The strongest reason is the mismatch between the information hierarchy and PCC's recurring jobs, rather than a need for a fashionable new skin.** Weekly planning hides actionable context behind intention cards; Music hides listening results behind controls and secondary summaries; the shell makes unpinned destinations hard to reach. A replacement visual system can address these together instead of accumulating isolated card reductions.

There are also smaller changes that should not wait for an aesthetic decision: Library focus containment, readable dock labels, a usable Spaces target, exact source-item navigation and phone-safe form typography. Fixing these is compatible with any later direction.

The product's useful foundations survive this judgment. Capture is direct. Domain boundaries are sensible. Books look like books. Music exposes numerical rankings and honest duration/tag limitations. The week distinguishes undated focus from real dates. The goal is to make these strengths easier to perceive and act on.

This is one agent applying several installed frameworks, source checks and browser measurements. It is **not** an independent designer panel, a completed redesign, user research, or a full accessibility certification. Impeccable's separate multi-agent `critique` command was not run.

## Brief and authority

PCC is a private phone-first planning and reference system for independent accounts. Its core jobs are fast capture, choosing concrete work, understanding the week, reviewing what changed and retrieving personal reference material. Music, Library and Expenses should be useful within that system without becoming generic enterprise dashboards.

The user's updated brief permits disruptive changes to layout, navigation, typography, surface treatment and visual identity. The old theme presentation is an incumbent implementation to evaluate, not a requirement to preserve unchanged. Product truth remains: separate domains, optional dates, canonical PCC ownership, account isolation, narrow Capture-only offline support, optional integrations and no silent AI writes. Keychain remains outside AI/context paths. No collaboration, growth mechanics, monetisation or invented metrics are proposed.

Sources of product truth: [AGENTS](../AGENTS.md), [product specification](product-spec.md), [interface rules](interface-rules.md), [architecture](architecture.md), [roadmap](roadmap.md), [Weekly Rhythm](weekly-rhythm.md). A future selected redesign should update interface rules and theme contracts deliberately; this audit does not silently replace them.

## Method and coverage

Fresh live captures S01–S23 were taken in the in-app browser during this reassessment. The previous 39 screenshots informed where to look, but are not reused as evidence for the new findings. Source was reviewed at `e56e5a35f104bf3ae4b493534e6aecc37007732d` on the existing audit branch. The live deployment's exact build revision was not attested, so live measurements and source findings are labelled separately rather than assuming every source detail is deployed identically.

Requested viewports were 390 x 844, 320 x 740 and 1440 x 1000 CSS pixels. These were desktop-browser layout tests, **not touch simulation or physical-phone tests**. Default theme was rendered; alternate themes were inspected in source only. No theme preferences, personal records, financial entries, Calendar events, playlist settings or review answers were saved. No external account permissions were changed. Opening and cancelling forms, switching analytical views and keyboard navigation provided interaction evidence.

| Installed resource | Applied in this run | Boundary |
| --- | --- | --- |
| Impeccable 4.7.0 | Context loader, technical audit checklist, engine 0.1.16 source detector | Source-only detector; no injected overlay or separate browser |
| Taste / design-taste-frontend | App-screen hierarchy, density, data honesty, object identity and recognition | Its app-screen guidance, not marketing-page rules; no new-design draw or Chrome inspector |
| Emil / emil-design-eng | Component behavior, frequency-sensitive motion, before/after review | No blanket animation added or animation-performance claim |
| Emil / mobile-native | Field text, touch/safe-area/viewport preconditions and hardware-verification boundary | Known CSS risks separated from actual-device symptoms |
| Anthropic / frontend-design | Brief-specific composition and critique of templated defaults | A distinctive replacement is a hypothesis, not a selected look |
| Product Design audit | Fresh screenshot-first flow review and explicit evidence limits | Private screenshots retained locally, not committed publicly |

Installed package snapshots: [Impeccable](https://github.com/pbakaus/impeccable/tree/dad8dbb3aac21ad1fa236c110315ef4abece23e8/.agents/skills/impeccable), [Taste](https://github.com/Leonxlnx/taste-skill/tree/63aba5f43b5056758b15bbe7d683da8c86a7a7ad/skills/taste-skill), [Emil](https://github.com/emilkowalski/skills/tree/2d228630ba1446365f614a108cb8252f1feda202/skills), [Anthropic](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design). The installed supporting resources were available locally; not every script or unrelated skill was executed.

## Evidence overview

| Step | Task inspected | Evidence | Health |
| --- | --- | --- | --- |
| 1 | Read Music month/year results; drill into an empty month; inspect Archive | S01–S02, S18–S20 | Works; result hierarchy and view meaning need redesign |
| 2 | Understand the week; open focused work; inspect and cancel New rhythm | S03–S05, S21 | Works; selected-action context and phone ordering are weak |
| 3 | Browse Agenda and identify the canonical owner | S06 | Readable; ownership and role need a product decision |
| 4 | Capture/Home and dated-work summary | S07, S22 | Direct capture; weekly coverage is ambiguous |
| 5 | Reach Spaces at phone/narrow widths; keyboard through dock | S08–S09, S23 | Serious target/contrast issues; narrow labels clipped |
| 6 | Browse Library; open/cancel editor; test last-control Tab and Escape | S10–S11, S17 | Strong shelf; confirmed background-focus escape |
| 7 | Inspect Expenses, empty income baseline, new-entry focus and Insights | S12–S15 | Good controls; financial-data coverage needs clearer language |
| 8 | Inspect Weekly Review entry in its completed state | S16 | Clear completion state; active review submission untested |

The [evidence manifest](ui-ux-audit-2026-10-evidence.md) maps every current capture to its state and a public-safe reproduction. Public repository rules prohibit committing the personal records visible in live screenshots. A private companion report contains the inspected originals; this public report intentionally contains no production URL, personal titles, account IDs, monetary amounts or screenshots.

## Technical assessment

| Dimension | Scoped score (0–4) | Basis |
| --- | --- | --- |
| Accessibility | 2 | Native labels/buttons, pressed states and visible dock focus coexist with the confirmed Library focus defect and low-contrast dock text |
| Performance | Not scored | No trace, throttled profile, bundle analysis or real Pi timing was collected |
| Theming | 2 | Shared tokens and semantic-status repair are good foundations; muted navigation and semantic combinations need full rendered theme coverage |
| Responsive design | 2 | Layout adapts; 320px recognition, tiny Spaces target and sub-16px editable text remain |
| Implementation integrity | 2 | Product-specific domains are clear; repeated same-weight surfaces weaken the visual hierarchy |

**Provisional scoped total: 8/16, 50% of assessed dimensions.** This is a prioritisation aid under the installed audit rubric, not a benchmark or a claim of WCAG compliance. Performance is omitted rather than awarded points without evidence. No P0 task-blocking failure was established in the inspected flows. The 18 ranked recommendations below comprise five P1 and thirteen P2 items. P1 means significant difficulty; it does not imply every P1 is a standards failure.

### Deterministic scan and false positives

`impeccable detect --json src` completed with exit 2 and **five warnings**: one `overused-font` at `src/app/globals.css:259`, and four `side-tab` findings at Projects:108, Review:146, Tasks:142 and `project-detail.tsx:187`. These are five rule matches, not five proven usability defects. This was a static source scan, not a rendered accessibility/performance scan.

- **Arial warning:** accurately locates the common font, but Arial is not an accessibility defect. Treat as a creative prompt under A18, not a replacement mandate.
- **Colored borders:** the inspected project/task implementation uses them for lifecycle/status meaning. Reject the blanket suggestion to remove them; status semantics must survive any redesign. Check each use visually for redundancy or excessive emphasis.
- **A missed defect matters more than a detector count:** the scan did not establish the Library focus escape or dock geometry. Those required live interaction and DOM measurements.
- **A false positive rejected during manual review:** the Expense Amount input has `outline-none`, but its group uses `focus-within:border-slate-950`; keyboard testing visibly darkened the border. It is not reported as having no focus indicator. Date and other custom fields still need their own focus checks.

### Measurements that change the priority

| Measurement | Result | Implication |
| --- | --- | --- |
| Spaces target | 32 x 12; four-pixel gap below 52 x 52 Capture | A03; insufficient size and spacing in measured state |
| Inactive dock labels | 10.24px; approximately 2.62:1 contrast in Default | A02; legibility and text-contrast failure |
| Music results at 390px | Songs y=1008; artists y=1455 | A05; key results below first phone view |
| Week at 390px with two intentions | Focus y=579; commitments y=843; dated work y=981 | A06; data order follows desktop columns rather than phone planning priority |
| Rhythm fields | Six controls, all 14px | A09; confirmed styling, iPhone effect requires hardware |
| Spaces at 320px | Eight measured labels wider than available text area | A10; recognition loss despite no page-wide overflow |
| Open book editor | Two main landmarks; no dialog role; Tab reaches covered navigation | A01; confirmed interaction defect |

Contrast calculation used measured computed Lab(D50) `65.5349 -2.25151 -14.5072`, chromatically adapted to D65 relative luminance, against 95% white over the default `#f8fafc` surface. The rounded result is sufficient to establish it is below 4.5:1; retained themes still require their own rendered checks.

## Ranked findings

Each entry separates observed behavior from a recommendation. Effort is relative: S = a small focused change, M = a flow/component change, L = a cross-screen design slice. It is not a delivery estimate.

### 1. [P1] A01 — Contain focus in the Library editor

**Location:** [Library editor](../src/app/library/page.tsx#L390), especially the overlay at line 525. **Evidence:** S11, S17. **Basis:** Observed + source. **Effort:** M.

**Observed:** Opening a book creates a full-screen fixed overlay. The live DOM contains two main landmarks and no dialog element or dialog role. From the final Delete book control, one Tab reaches the covered Projects navigation link. Escape closes the editor, but focus remains on that background link in this sequence.

**Why it matters:** Keyboard users can operate a navigation layer that is visually unavailable, and assistive technology has no named modal boundary. This is a confirmed interaction defect, separate from whether the editor looks attractive.

**Recommendation:** Choose one coherent model: a real editing route with one main landmark and browser history, or a named modal with inert background, initial focus, contained Tab/Shift+Tab, and focus restored to the invoking book. Keep the working Escape and Cancel paths.

**Acceptance:** Open a fictional book with keyboard; cycle forward/backward through all controls; focus never enters covered content; Escape returns to the invoking book without losing shelf/search position.

### 2. [P1] A02 — Raise dock label contrast

**Location:** [DockLink](../src/components/app-shell.tsx#L100). **Evidence:** S01, S23; measured computed styles. **Basis:** Observed + source. **Effort:** S.

**Observed:** Inactive navigation labels render at 10.24px using text-slate-400. The measured Lab foreground against the translucent white dock over the default page yields approximately 2.62:1 contrast. These are destination names, not disabled controls.

**Why it matters:** Small low-contrast labels make the permanent wayfinding harder to read. The measured default pair is below the 4.5:1 text threshold; increasing contrast is necessary even if labels become larger.

**Recommendation:** Introduce a navigation-secondary token with sufficient contrast in every theme, increase label legibility, and retain a second active-state signal. Measure the actual composited dock background rather than a white swatch alone.

**Acceptance:** Normal-size dock text meets 4.5:1 in every supported theme; active, inactive, keyboard focus and disabled states remain distinguishable. Include a real-phone sunlight check.

### 3. [P1] A03 — Make All Spaces a visible, comfortable navigation action

**Location:** [Mobile shell](../src/components/app-shell.tsx#L66). **Evidence:** S01, S08, S23; measured target geometry. **Basis:** Observed + source. **Effort:** M.

**Observed:** The gateway to unpinned spaces is a 32 x 12 CSS-pixel chevron beneath Capture. Capture is 52 x 52. The handle begins only four pixels below Capture; a 24-pixel spacing circle centered on the handle intersects the Capture target. It has a good accessible name, but no visible text label.

**Why it matters:** An easy-to-miss, difficult-to-hit control gates Music, Expenses and other unpinned destinations. Its height and measured neighboring geometry fail the minimum target-size/spacing test in this state.

**Recommendation:** Give Spaces a labelled target of at least 44 x 44 as PCC's phone usability goal. Rebalance the dock, use an explicit More/Spaces destination, or put Capture in a separate stable position. A swipe may supplement the control, never replace it.

**Acceptance:** At 320 and 390px, reach an unpinned space without guessing a gesture, overlapping Capture or needing a precision tap. Verify minimum target-size geometry and actual thumb use.

### 4. [P1] A04 — Open the specific work item from planning views

**Location:** [Weekly focus links](../src/app/rhythm/page.tsx#L324), [dated links](../src/app/rhythm/page.tsx#L404), [Home](../src/app/page.tsx). **Evidence:** S03, S04, S07, S21. **Basis:** Observed + source. **Effort:** M.

**Observed:** A selected project action in Weekly focus opens /projects, with the project still closed, instead of the selected action. Dated work uses the same collection-level destinations. Source references already contain the source item/action identifiers.

**Why it matters:** The planning view promises an actionable object, then makes the user search for it again. This is a repeated context loss in a product intended to reduce mental review.

**Recommendation:** Add source-aware navigation that selects and reveals the exact Task or Project Action in its canonical editor. Preserve the originating week, filters and scroll position on return; avoid duplicating the domain editor in a separate weekly data model.

**Acceptance:** With several fictional projects and actions, each planning row opens exactly its referenced object; Back restores the same week and position; completed or missing sources get an explicit recoverable state.

### 5. [P1] A05 — Put Music listening results before secondary panels

**Location:** [Music composition](../src/app/music/page.tsx#L17), [insight panel](../src/components/music-insights-panel.tsx). **Evidence:** S01, S18, S19, S20. **Basis:** Observed + source. **Effort:** M.

**Observed:** At 390 x 844, Most played songs starts at document y=1008 and Top artists at y=1455. Discovery, two full-width mode strips, period controls, four metric cards and Genres come first. The genre module is prominent despite low tag coverage. Desktop also places rankings near the bottom of the first viewport.

**Why it matters:** The screen spends its most valuable space on setup and framing before answering what was listened to. Desktop width is used to enlarge secondary modules rather than accelerate comparison.

**Recommendation:** Lead with one compact period control and a useful portion of songs/artists. Use inline summary figures and a secondary Trends/Genres area. Keep rediscovery available as an intentional action. Retain honest duration/tag-coverage qualifications near the affected data.

**Acceptance:** At 390 x 844, the initial view contains the period, meaningful listening summary and at least the first ranked results. Desktop exposes both rankings together. Empty and low-coverage histories remain understandable.

### 6. [P2] A06 — Make the weekly question determine mobile order

**Location:** [Weekly layout](../src/app/rhythm/page.tsx). **Evidence:** S03, S21. **Basis:** Observed + source. **Effort:** M.

**Observed:** With two active intentions, mobile Weekly focus starts at y=579, Fixed commitments at y=843 and Dated work at y=981. The desktop two-column composition is more useful because the fixed/dated context stays alongside intentions.

**Why it matters:** A phone user must scroll through large count-based intention cards before seeing what constrains the week. Adding intentions will increase that distance.

**Recommendation:** Prototype a week overview ordered around commitments and selected work, with compact intention progress. Preserve the four distinct meanings: fixed commitments, dated work, undated weekly focus and flexible recurring intentions. Do not turn every intention into a calendar appointment.

**Acceptance:** On phone, the first view signals both selected work and upcoming constraints. Test 0, 2 and 8 intentions. One date-bearing focused action is recognisable as the same source in both contexts.

### 7. [P2] A07 — Disambiguate the two meanings of This week

**Location:** [Home near-term section](../src/app/page.tsx#L186), [weekly focus resolution](../src/domain/weekly-rhythm.ts). **Evidence:** S03, S07, S22. **Basis:** Observed + source. **Effort:** S-M.

**Observed:** Home calls its dated/overdue subset This week and links to Open full week. Rhythm also calls itself This week, but adds undated weekly focus, intentions and fixed commitments. Selected undated work is absent from Home's subset.

**Why it matters:** The same heading can suggest the same coverage, so a planning decision can disappear from the entry screen without actually being removed.

**Recommendation:** Either name Home's subset Dated work through Friday, or make it a genuine compact week summary that includes selected undated focus. Keep dates optional; do not manufacture dates to make an item appear.

**Acceptance:** A fictional undated focus item has an obvious place or an explicit coverage explanation on Home. Counts and empty states describe the same scope as the heading.

### 8. [P2] A08 — Resolve Agenda around ownership and time horizon

**Location:** [Agenda event cards](../src/app/agenda/page.tsx#L442), [weekly guide](weekly-rhythm.md). **Evidence:** S06. **Basis:** Observed + source. **Effort:** M-L.

**Observed:** Agenda mixes external events and PCC projections in large date-grouped cards. A PCC-owned action exposes Open in Google Calendar instead of an obvious canonical PCC edit path. Source descriptions repeat the source badge, consuming much of a phone screen. No user-facing source or horizon filter is present in the inspected listing.

**Why it matters:** Users must infer where an item is editable, while a long mixed list competes with the weekly planning surface.

**Recommendation:** Keep PCC editing in PCC and use Google Calendar as the external viewer. Test one Upcoming horizon accessible from the week before retaining a parallel top-level planning destination. Collapse repeated projection descriptions; keep source filters and readable time grouping. Resolve issue #72 with a real-use decision, not visual polish alone.

**Acceptance:** For each event type, the primary action reaches its owner. A week-to-upcoming path preserves near-term and later commitments. Remove Agenda only after its unique creation, meeting and browsing jobs have working homes.

### 9. [P2] A09 — Use phone-safe field typography

**Location:** [Rhythm form](../src/app/rhythm/page.tsx#L564), [Library editor](../src/app/library/page.tsx), [Archive form](../src/components/music-archive-panel.tsx#L90). **Evidence:** S02, S05, S11; computed field styles. **Basis:** Measured CSS; device effect unverified. **Effort:** S.

**Observed:** All six inspected Rhythm inputs/selects/textareas render at 14px. Library fields also render at 14px. Archive uses explicit text-sm. The application allows browser zoom, which is correct.

**Why it matters:** Small editable text is a known iPhone focus-zoom risk and is harder to enter accurately. This run confirms the CSS precondition, not an observed physical-iPhone zoom event.

**Recommendation:** Make editable field text at least 16px on phone without increasing every caption. Keep native input modes and visible labels. Check the actual software keyboard, safe areas, sticky controls and scroll-to-focused-field behavior on iOS and Android.

**Acceptance:** Computed editable field text is at least 16px on phone; focusing fields on a real iPhone does not cause unwanted zoom; the focused field and submit/cancel actions remain reachable with the keyboard open.

### 10. [P2] A10 — Preserve space names at narrow widths

**Location:** [Two-column directory](../src/app/spaces/page.tsx#L61), [DestinationCard](../src/app/spaces/page.tsx#L130). **Evidence:** S08, S09. **Basis:** Observed + source. **Effort:** S.

**Observed:** At 320px, the two-column grid retains icon, gap and padding while truncating familiar destination names. Eight measured destination labels exceeded their available text width. The screenshot shows fragments such as abbreviated Projects and Expenses.

**Why it matters:** Navigation depends on recognition; making the user reconstruct the destination is a meaningful failure even when there is no page-level horizontal overflow.

**Recommendation:** Use a one-column list at the narrow breakpoint, reduce nonessential framing, or permit a second line. Preserve complete accessible names and adequate targets; do not solve this by shrinking the text.

**Acceptance:** All active space names remain understandable at 320px and enlarged text, including the longest destination. No page-wide horizontal scroll or clipped navigation text.

### 11. [P2] A11 — Distinguish an absent income baseline from a zero budget judgment

**Location:** [Month calculation](../src/domain/expenses.ts#L260), [Expenses month](../src/app/expenses/page.tsx#L302). **Evidence:** S12. **Basis:** Observed + source. **Effort:** S-M.

**Observed:** A month with spending and no entered income renders zero allocation targets and money over target. The calculation is consistent with recorded inputs, but the interface does not distinguish missing income entry from an intentional zero-income month.

**Why it matters:** The presentation can imply a budget failure when the data needed to interpret the budget has not been recorded. This is a data-coverage problem, not a request for financial advice or a new budgeting policy.

**Recommendation:** Show an explicit income-baseline-not-recorded state and keep spending totals visible. Offer a neutral Add income action, while preserving the ability to record an actual zero-income period. Avoid hiding facts or inferring bank balances.

**Acceptance:** Fictional no-income-entered, genuine-zero and positive-income cases are separately understandable. Allocation rules remain the current fixed reference unless a product decision explicitly changes them.

### 12. [P2] A12 — State the denominator behind expense averages

**Location:** [Insights range and average](../src/app/expenses/insights.tsx#L188). **Evidence:** S15; source calculation. **Basis:** Observed + source. **Effort:** S.

**Observed:** Avg / month divides total spending by the count of calendar months in the selected range, including months without recorded transactions and the current partial month. The formula is deterministic; the compact metric does not explain that denominator.

**Why it matters:** For a partial recording history, a range average can look like a typical spending month despite unknown coverage. Months without transactions cannot automatically be described as missing or complete.

**Recommendation:** Label the denominator and current partial period near the figure. If an alternative recorded-month average is offered, name it distinctly and show the number of months. Do not silently change the existing arithmetic.

**Acceptance:** With one populated month in a longer selected interval, a user can identify which months the average includes. True zero-record months, unknown recording coverage and a partial current month are not presented as equivalent evidence.

### 13. [P2] A13 — Make Calendar coverage and freshness visible where the week relies on it

**Location:** [Weekly Calendar fetch](../src/app/rhythm/page.tsx#L190), [commitments](../src/app/rhythm/page.tsx#L369). **Evidence:** S03, S21; source. **Basis:** Observed + source. **Effort:** S-M.

**Observed:** The week handles a disconnected Calendar and fetch errors explicitly. Its normal commitment list lacks a compact last-fetched/coverage indication. It is easy to read an empty fixed-commitment list as a free week even though source coverage may be partial.

**Why it matters:** Planning confidence depends on what was checked, not simply whether some events loaded. The repository already warns that Calendar coverage may be incomplete.

**Recommendation:** Expose concise source coverage and refresh state close to commitments, with details on demand. Use No commitments found in connected calendars rather than an availability claim. Keep the week useful without integrations.

**Acceptance:** Connected, disconnected, partial-source, failed-fetch and stale-result states can be distinguished without opening Account. No empty state claims the person is available.

### 14. [P2] A14 — Separate Library reading from comprehensive editing

**Location:** [Book opening and editor](../src/app/library/page.tsx). **Evidence:** S10, S11. **Basis:** Observed + source. **Effort:** M.

**Observed:** The shelf is visually specific: real covers, reading state and a score make books easy to recognise. Opening a book immediately exposes a large editor with cover management, metadata, placement, dates, ratings and reflections.

**Why it matters:** A quick check of a takeaway or reading state requires entering an administration-sized surface. The strength of the browsing model is not carried into the opened object.

**Recommendation:** Explore a focused reading/detail view with concise primary actions and deliberate Edit details. Retain the full form for intentional edits, preserve comic/sequential-work progress, and fix A01 independently of this redesign choice.

**Acceptance:** From a fictional book, read its takeaway or update the main reading state without traversing unrelated fields. Editing remains complete, cancellable and accessible.

### 15. [P2] A15 — Expose expansion state and disambiguate repeated actions

**Location:** [Music list expansion](../src/components/music-insights-panel.tsx#L236), [weekly controls](../src/app/rhythm/page.tsx#L335). **Evidence:** S03, S18; source. **Basis:** Source-confirmed semantic gaps. **Effort:** S.

**Observed:** Music expansion buttons switch between Show all and Show fewer but do not expose aria-expanded or a controlled-region relationship in the source. Rhythm repeats Edit, Pause and Remove labels across multiple objects.

**Why it matters:** The visual result may be clear while an assistive-technology user must reconstruct which object and state an action controls.

**Recommendation:** Give each expandable list a stable region ID and reflect expanded state. Give repeated object actions a contextual accessible name, preserving concise visible text. Keep native buttons and existing pressed states on view controls.

**Acceptance:** Accessibility inspection identifies which list is expanded and which object each Edit/Pause/Remove affects. Keyboard activation and focus remain stable after expanding/collapsing.

### 16. [P2] A16 — Announce asynchronous Music state changes

**Location:** [Music loading/results](../src/components/music-insights-panel.tsx#L76). **Evidence:** S19, S20; source. **Basis:** Source-confirmed; assistive-tech effect unverified. **Effort:** S.

**Observed:** Period switches update a loading paragraph and replace results. Errors have role=alert, but the loading paragraph has no live status and the results container has no aria-busy. Random-song results already use a polite live region, demonstrating a useful internal pattern.

**Why it matters:** A user who cannot see the changed figures may not receive a clear completion signal after choosing a period. This is a source-level risk; no screen-reader session was run.

**Recommendation:** Use a concise polite status for loading/completion and an appropriately busy results region. Announce the selected period and result count, not every row or a long chart transcript. Keep a stable results frame where practical.

**Acceptance:** With NVDA or VoiceOver, changing period announces progress and completion once, keeps focus on the chosen control, and permits navigation into the updated results. Error and empty states remain distinct.

### 17. [P2] A17 — Keep Music view state recoverable across navigation

**Location:** [Music local view state](../src/app/music/page.tsx#L10), [local period state](../src/components/music-insights-panel.tsx#L66). **Evidence:** S02, S19, S20; source. **Basis:** Source-confirmed state model; history variants unverified. **Effort:** M.

**Observed:** Timeline/Archive, month/year mode and selected period are component-local state. They are absent from the inspected route and are initialized anew on mount. These controls represent a meaningful browsing context rather than a persistent personal-data edit.

**Why it matters:** A user cannot copy the selected analytical view as a URL and risks losing context when visiting another space or returning from an external handoff. This run inspected state ownership; it did not certify every browser history/cache path.

**Recommendation:** Encode safe view context in query parameters or another explicit recoverable route model. Keep identifiers private where necessary. Do not persist transient analysis by modifying canonical records.

**Acceptance:** Select a historical year/month, visit another PCC space and return; mode, period and expansion behavior follow an explicit documented contract. A URL with valid view parameters restores the intended view; invalid parameters have safe defaults.

### 18. [P2] A18 — Replace the universal card treatment with a product-specific hierarchy

**Location:** [Shared styles](../src/app/globals.css#L253), [Metric](../src/components/music-insights-panel.tsx#L23), [Home](../src/app/page.tsx). **Evidence:** S01, S07, S08, S12, S18, S21, S22. **Basis:** Design judgment; redesign hypothesis. **Effort:** L.

**Observed:** Many unrelated things receive a white rounded surface, thin border and soft shadow: page sections, nested intentions, individual metrics, mode switches and directory entries. Arial carries almost all text. Much of the identity is left to optional palettes and Capture artwork. The working shell rarely names PCC.

**Why it matters:** The app is coherent enough to use, but too many surfaces receive similar visual weight. A new palette alone would preserve the same hierarchy problems and the same generic composition.

**Recommendation:** Explore a replacement visual system across Home/week and Music together: a deliberate type scale, differentiated data/list/form surfaces, fewer nested frames and recognisable PCC orientation. Keep useful covers and source-aware objects. Treat typeface and palette choices as design hypotheses, not detector-mandated fixes.

**Acceptance:** Compare distinctly different visual systems using the same fictional content and real tasks on phone and desktop. The preferred system improves scan order, direct action and recognition; contrast and semantic states pass in all retained themes.

## What the visual system should change

The present system communicates “a collection of neatly framed modules.” PCC's stronger idea is “a personal place to decide what deserves attention, then return to living.” The redesign should express that through retrieval, orientation and calm task order. It should not turn private planning into a productivity score, a command-center fantasy or a commercial analytics suite.

Typography is an open design axis. Choose a face and scale because they suit repeated reading, numbers and compact control labels; compare them in the actual screens. Swapping Arial for whichever font a skill recommends would not resolve the hierarchy. Similarly, less shadow is useful only when lists, spacing, alignment and selected states still communicate structure. Removing all frames without supplying hierarchy would produce a thin interface rather than a better one.

Use object identity where it helps: Library covers, a named project/action context, recognisable week boundaries and actual listening ranks. A large hero, four decorative KPI cards, tinted icons and an invented “weekly performance” score would be the wrong way to give PCC a personality. The product already has enough real substance.

### Before/after design-engineering contract

These are proposed outcomes, not changes implemented by this PR.

| Before | After | Why |
| --- | --- | --- |
| 12px-high hidden-purpose Spaces handle | Visible labelled navigation target with separate Capture hit area | Frequent navigation should not require fine motor precision or recall |
| Planning row links to a collection | Exact canonical source opens; Back preserves origin | The row should deliver the object it names |
| Book overlay leaves background tabbable | Real route or fully contained named modal | Visual and keyboard layers must agree |
| 14px phone form text | At least 16px editable text; compact captions remain secondary | Improve input readability and avoid an iPhone zoom precondition |
| Shadowed cards at nearly every level | Deliberate page, section, object and control hierarchy | Group by meaning rather than giving every box equal weight |
| Separate high-emphasis Music switches stacked above results | Compact coordinated period/view controls and results first | Repeated use should optimise answering the listening question |
| Add motion as a general polish pass | Immediate frequent navigation; brief state feedback only where explanatory | Repeated animation can add latency without adding meaning |

### Redesign directions worth comparing next

At audit time these were **three research briefs**, not rendered mockups or a selected visual world. A subsequent [Figma exploration and Projects device study](ui-design-directions-2026-10.md) now provides editable alternatives; no visual world has been selected. Keep the same fictional content and identical tasks so they can be compared fairly. Each must cover Home/week and Music on phone and desktop; a single attractive dashboard shot is insufficient.

1. **A personal daybook.** Make the week a readable sequence of commitments and chosen actions, with a compact always-available Capture entry. Music becomes a period journal with ranked songs and a short change summary, while books retain their physical identity. Distinction comes from reading rhythm, dates and object typography. Risk: drifting into fashionable newspaper styling or tiny editorial labels. Test fast scanning and thumb actions before expanding the approach.
2. **A precise working instrument.** Use compact, well-aligned rows, a clear destination system and progressive details. The week answers what is fixed, what is chosen and what comes next; Music exposes comparative lists immediately. Distinction comes from responsive behavior and information precision. Risk: another generic monochrome admin kit. Require a recognisable PCC shell and product-specific objects rather than stock tiles.
3. **A collection of personal places.** Give planning, listening and reference a related but distinct emphasis: calm task-led planning, content-led listening, cover-led media. Use one navigation and interaction grammar while permitting meaningful domain variation. Game-inspired personality can remain through a deliberate theme layer, or be replaced by a new identity. Risk: separate mini-apps or art obscuring function. Test cross-space orientation, semantic colors and consistent controls.

Any direction may change palette, fonts, radius, shell structure and theme presentation. No direction may use personal data publicly, invent achievements, equate missing data with zero, remove optional dates, or weaken domain ownership. If existing themes remain, explicitly budget contrast, artwork and state coverage for them; if theme scope changes, make that a reviewed product decision.

### How to choose

Use three concrete scenarios: find and open an undated selected action; understand the next fixed commitment alongside it; identify a period's top songs/artists and switch to another period. Include a long title, empty data, several intentions and a populated history. Evaluate one-handed entry, scan order, reading comfort, direct source access and return navigation. After choosing one visual direction, implement one end-to-end slice before replacing every screen.

No visual option is selected by this report. The linked Figma exploration provides inspectable alternatives for review before implementation. The installed skills contribute criteria; they do not vote on the user's taste or override a clear brief.

## What to keep

- Capture has a clear field and a clear Save to inbox action. Online state is quiet; exceptional sync state has dedicated patterns. Preserve the narrow offline promise and the current canonical data model.
- Desktop Home puts capture and concrete near-term items side by side. That is a useful use of width even if its framing changes.
- Library's shelf imagery, reading states and separate Wishlist model are stronger references for object recognition than a universal dashboard kit. Zero ratings remain distinct from unrated.
- Music rankings have explicit ranks and counts. Genre coverage, unknown durations and historical artist-credit limitations are acknowledged. The year chart exposes labelled native buttons and successfully drills into a month. Empty periods explain the absence of listening records.
- The week does not require artificial dates for selected focus. Intention progress is count-based rather than a guilt/streak mechanic. Preserve that distinction when changing the layout.
- Native buttons, labelled fields, pressed view states, Calendar disconnection/errors, Escape/Cancel in the book editor and visible dock keyboard focus are real foundations. They need consistent completion, not replacement by bespoke interactions.
- The shared theme tokens and explicit semantic-status stylesheet show the right separation between visual personality and lifecycle meaning. A redesign should refine that contract rather than let a game palette redefine danger or Waiting.

## Technical boundaries and follow-up verification

This audit does not establish loading speed, animation frame rate, accessibility conformance, physical-phone usability or theme parity. No browser/device throttling, screen reader, full 200%/400% zoom pass, touch gesture synthesis, installed-PWA cold start, keyboard-open real-device session, offline capture mutation, upload, destructive flow, financial write, playlist save or active review submission was exercised.

Source inspection found `viewport-fit=cover`, bottom safe-area spacing, `touch-action: manipulation`, unrestricted browser zoom and standalone overscroll handling. Those are positive preconditions. `min-height:100vh` on a scrolling document is not itself evidence of a broken fixed-height shell. Likewise, lack of elaborate animation or a global reduced-motion stylesheet does not prove harmful motion. Evaluate actual motion and provide appropriate reduced-motion behavior if motion is introduced; do not install a blanket near-zero-duration rule without checking state communication.

The source detector did not profile React rendering, run a security audit or prove which API call is expensive. Source-only opportunities such as cancelling obsolete requests or preserving a results frame should be measured before being presented as performance wins. A typed input-state change and a failed submission test also require different evidence; no successful write was inferred from merely opening a form.

For the next implementation, use fictional data to test long strings, empty lists, zero values, missing fields, partial histories and many items. The installed break-ui skill is suitable when a testable local implementation is available, but was not run against production records in this read-only audit. Animation skills should be applied to actual proposed motion, not used to manufacture motion requirements.

## Recommended sequence

1. **Accessibility and navigation floor:** A01–A04, A09–A10 and A15–A16. Fix Library containment, dock contrast/Spaces and exact-item access, then field text and semantic states. These are reviewable slices independent of a chosen look.
2. **Clarify the product model in the interface:** A07–A08 and A11–A13. Resolve Home/week coverage and Agenda ownership; make data coverage visible without changing calculations silently.
3. **Compare the three redesign briefs:** A05–A06, A14 and A18. Choose on shared phone/desktop tasks. Record the selected design system and any revised theme scope before broad implementation.
4. **Implement and verify one slice:** include A17's view-state contract where applicable; then extend shared tokens/components to remaining domains. Recheck actual content and domain-specific exceptions.
5. **Finish with `$impeccable polish` and repeat the technical audit.** Suggested tools by job: `$impeccable harden` for focus/semantics, `$impeccable adapt` for targets/reflow, `$impeccable clarify` for coverage language, and `$impeccable shape`/`layout`/`typeset` after a redesign brief is selected. These are follow-up options, not commands executed by this documentation PR.

The [backlog CSV](ui-ux-audit-2026-10-backlog.csv) contains all 18 priorities and acceptance checks. This report recommends exploration and fixes; it does not approve their implementation or change the roadmap's accepted feature order.

## Standards and interpretation

- [W3C target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): the AA criterion uses 24 x 24 CSS pixels with defined exceptions, including spacing. PCC's recommended 44 x 44 target is a stronger phone usability goal. Not every control under 44px is automatically a WCAG AA failure.
- [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): normal text needs 4.5:1, with specified exceptions. Inactive navigation labels remain active controls and do not qualify as disabled text.
- [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): test at the narrow equivalent width, while recognising that necessary two-dimensional data can have exceptions. Avoid claiming that fitting within a viewport proves labels remain usable.
- [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): a modal has a named boundary, contained Tab order, inert background and deliberate focus entry/return. Adding aria-modal alone would not fix the observed interaction.

## Repository validation for this report

The change contains Markdown and CSV documentation only. Check relative links against repository files; verify all S01–S23 and A01–A18 identifiers; parse CSV; inspect UTF-8 and the full diff; verify public content excludes live screenshots, private records and production URLs. Application lint, unit tests, build and Compose validation are not substitutes for those checks and are not required to validate a prose-only report. They become required as applicable when runtime/configuration changes are implemented.
