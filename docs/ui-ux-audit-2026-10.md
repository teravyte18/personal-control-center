# Personal Control Center — Live UI/UX Audit

20 October 2026 · Public-safe findings · Recommendations pending review

## Assessment

PCC already has a coherent visual foundation: quiet surfaces, restrained colour, recognisable navigation, useful domain distinctions and a strong Capture action. The evidence supports improving hierarchy and connected workflows before choosing an aesthetic change; alternate visual directions were not evaluated. Its main weakness is that the spaces share styling more successfully than they share the user's workflow.

Music makes the controls and secondary data easier to reach than the listening history. Rhythm contains the right planning concepts but gives recurring intentions more screen space than the constraints and work needed to plan the week. Agenda duplicates dated work while directing users away from PCC to interact with PCC-owned records. The phone launcher makes access to all these spaces unnecessarily fragile.

The recommended direction is a small sequence of changes: make navigation and source handoffs reliable; give Home and Rhythm one consistent weekly model; reduce Music's vertical overhead; then decide whether Agenda survives as a compact Upcoming view. Keep the existing typography, themes, Capture artwork and domain boundaries.

## Scope and evidence

The live audit used the existing signed-in in-app browser. The private audit captured 39 accepted screenshots with matching DOM snapshots. The images, DOM dumps and production record values are intentionally excluded from this public repository. Evidence numbers refer to the public-safe [capture matrix](ui-ux-audit-2026-10-evidence.md), not files available in Git. Desktop was checked at 1440 × 1000 CSS pixels; phone at 390 × 844; narrow reflow at 320 × 740. These are browser viewport checks, not tests on a physical phone. Browser sizing was restored afterward.

Reviewed repository sources: AGENTS.md, docs/README.md, interface-rules.md, ux-refresh-2026.md, product-spec.md, roadmap.md, weekly-rhythm.md and spotify-music.md. Documentation establishes intent; the screenshots establish the observed interface. Current default-theme screens are the visual evidence. Alternate themes were not activated.

The audit exercised navigation, Music period controls and chart drill-down, expanded rankings, random discovery, archive configuration inspection, Rhythm's Add work picker and empty New rhythm form, source project opening, Agenda's empty New event form, Expenses category filtering, Library shelves and reading filters, a book panel, Review availability, task expansion and a keyboard tab/activation check. Forms were dismissed without saving. No captures, tasks, completions, calendar events, settings, playlist reconciliation or genre-enrichment actions were submitted. The audit did not change application code or runtime behavior.

**Observed** means visible in this run. **Recommendation** means a design judgment based on that evidence. **Unverified** means the workflow could not be tested safely or the evidence does not establish it. Original screenshots contain private application content and remain outside Git. This document records the same interface findings with identifying examples and production values removed.

## Research basis and independence

This is an evidence-led review of the existing interface, not an independent designer's opinion or a new visual-direction exploration. The Product Design plugin supplied the audit workflow: capture and inspect the real flow, tie findings to evidence, separate concept problems from interface problems, and state limits. It did not supply a second reviewer or automatically redesign screens.

External references were read as research: [Taste Skill](https://github.com/Leonxlnx/taste-skill) and its [app-screen guidance](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/references/app-screens.md), [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), W3C target-size/reflow guidance, and NN/g recognition-versus-recall guidance. Taste Skill and Anthropic's skill were not installed or executed as separate review agents. The author's recommendations remain design judgments grounded in observed PCC behavior.

The proposals preserve the existing identity because the brief explicitly requested refinement, existing themes and a phone-first product. They do not demonstrate that the current aesthetic is the best possible alternative. If the design discussion needs to challenge that aesthetic, compare reference-led visual alternatives using the same fictional data, viewport and user job before choosing a direction. Do not infer independent aesthetic validation from this audit.

## What is already working

- **A useful domain model.** Flexible weekly focus is distinct from actual dates; recurring intentions use weekly counts rather than streaks. Keep those distinctions.
- **A bounded shell.** Desktop pins have labels and do not turn into an all-spaces scrolling rail. The phone dock keeps the same Capture anchor and four working shortcuts.
- **Concrete Home content.** Home names actual dated work and its owner rather than showing only warning counts.
- **Library's browsing hierarchy.** Media shelves, search, view selection and covers make the stored objects recognisable. Series defaults to Watching and exposes the saved resume position.
- **Expenses' filter-to-result relationship.** Selecting a category changes the summary, breakdown title, description list and trend together. Its aligned rows are a better density reference than a separate bordered card for each event.
- **Music's working foundations.** Artist rankings were numerically ordered in the inspected data; expansion worked. The year chart drilled into a selected month correctly. Unknown playback durations and incomplete genre coverage are acknowledged. Random rediscovery returned a song and Spotify link without starting playback.
- **Some accessibility foundations.** Inputs generally have names; navigation links have accessible labels; Music buttons expose pressed state. Tab reached Archive with a visible outline, and Enter activated it. The phone year chart wraps into two rows of six months; the sampled month target was about 45 × 126 CSS pixels. It is not a tiny-target defect.

## Findings: navigation and shared shell

### N1 — The phone's gateway to unpinned spaces is too small and visually ambiguous

**Observed · High impact · Interface/accessibility · Evidence 23, 26, 35.** The Open all spaces link is a small unlabelled chevron beneath Capture. Its measured link box at 390 pixels is 32 × 12 CSS pixels, versus 52 × 52 for Capture and about 69 × 48 for ordinary dock destinations. It looks like a drag handle; a tap can be confused with the nearby Capture action. Music, Expenses and Library currently depend on that route on phone.

**Change:** retain Capture in the centre, but make Spaces an explicitly labelled control with a comfortable hit area. First try a compact “Spaces” label and chevron in a distinct 44-pixel-high target outside Capture's hit area. If that makes the dock too tall, use a visible small Spaces button above the dock rather than shrinking its target. The 44-pixel goal is a comfort recommendation; WCAG's minimum target criterion uses 24 pixels with exceptions. The measured 12-pixel height is a confirmed concern; spacing and any extended hit area need formal verification. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

**Trade-off:** a little more navigation space, or a small additional visible button. This is justified because Spaces is the complete launcher, not an occasional secondary shortcut. Preserve the existing themes and central artwork.

### N2 — The launcher loses destination names at narrow widths

**Observed · High impact at 320 pixels · Interface · Evidence 24, 25, 35.** At 320 pixels, Projects, Rhythm, Agenda, Thoughts, Expenses and Markets truncate to short fragments. Accomplishments is already truncated at 390 pixels. The layout technically fits, but recognising destinations requires guessing from an icon or a fragment.

**Change:** allow two-line names and use one column below the width at which the longest normal labels no longer fit. Keep two columns at wider phone widths. Make the full name available visually, rather than relying on a tooltip or accessible name alone. Keep comfortable row height and reduce the icon-to-label gap before reducing font size.

**Trade-off:** more vertical scrolling on very narrow screens in exchange for reliable navigation. No new menu or search feature is necessary. The 320-pixel test shows that avoiding horizontal overflow alone is an insufficient acceptance check. [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

### N3 — The information architecture is broadly sound; labels and lower-priority entries need cleanup

**Observed · Medium impact · Interface/product boundary · Evidence 01, 24, 25.** Plan, Reference and Tracking form understandable groups. Account and navigation preferences are correctly below working spaces. However, “Rhythm” in navigation opens “This week”; Home also has “This week”; the Calendar link says “Agenda / Google Calendar” but opens PCC Agenda. The Later section contains Settings while real account and navigation settings already exist.

**Change:** keep the groups and independent pins. Use “This week” as the navigation name, with “Rhythm” retained as the recurring-intentions section or product terminology. Name the Agenda link for its actual destination. Remove the nonfunctional Settings placeholder or rename it to the specific future capability it represents.

**Trade-off:** a small terminology adjustment for an existing user. Use the same chosen labels in navigation, page titles and Home links. Visible, stable labels reduce dependence on recall. [NN/g recognition guidance](https://www.nngroup.com/articles/recognition-and-recall/)

## Findings: Music

### M1 — The primary listening content is buried under repeated controls and secondary content

**Observed · High impact · Interface · Evidence 02, 04, 26, 36.** The phone order is title, rediscovery panel, Timeline/Archive switch, Month/Year/All time switch, duplicated period heading/input, four summary tiles, duration caveat, Genres, songs, artists, then phases. At 390 × 844 in the captured layout, Most played songs starts about 1,008 pixels from the top and Top artists at 1,455. These are layout measurements, not performance timings or fixed positions for every dataset. The user cannot glance at their leading artists in the initial viewport.

**Change:** place page mode and period first, then a compact two-by-two summary with light separators rather than four independently elevated cards. Put Songs/Artists directly below it, using a shared view switch on phone and aligned lists on desktop. Move rediscovery below those lists or expose it as a modest header action whose result opens only when requested. Consolidate the period heading and picker into one readable control while keeping previous/next buttons.

**Trade-off:** discovery is less prominent before it is requested; ranked listening history becomes faster to scan. Preserve rediscovery as a distinctive feature rather than deleting it. Avoid a new hero, cover collage or decorative dashboard.

### M2 — Sparse genre data receives more authority and space than its coverage supports

**Observed · Medium-to-high impact · Data presentation policy + interface · Evidence 02, 04, 05, 26, 27.** Tagging coverage was sparse in the inspected periods; exact personal listening counts and percentages are withheld from this public version. The chart is visually substantial and the leading bar fills its available track. The caveat exists, but the title “Genres” still invites a reading of the whole listening profile. The archive page separately reports cache coverage by tracks; that is a different denominator.

**Change:** label the section “Genres among tagged plays”, keep the play-coverage percentage beside it, and give its bars an explicit Plays unit. During sparse coverage, start with a compact summary and an expand control. Explain the per-track cache count separately in setup; do not present it as equivalent to percentage of plays with genres. Keep untagged plays visible as coverage context if using a composition chart.

**Trade-off:** a quieter chart until enrichment becomes more representative. Do not increase worker throughput merely to improve appearance; the current repository explicitly retains bounded background enrichment. A low-coverage graphic can still be available on request.

### M3 — “Archive” promises browsing but opens automation settings

**Observed · Medium impact · Product vocabulary/interface · Evidence 06, 29.** Archive opens a playlist URL, a threshold, an automatic-add checkbox, Save, Check playlist now and genre-enrichment controls. There is no browsable archive list in this tab. Rediscovery is described as drawing from a “5+ plays archive”; the feature documentation says its fixed five-play threshold is independent from the configurable playlist threshold.

**Change:** rename the tab “Playlist setup” or move it into a clearly secondary Music settings panel. Add an “Open playlist in Spotify” link and a concise automation state if the implementation can establish it. Use “From your listening history · 5+ qualifying plays” for random discovery. If a browseable qualifying-song list is desired later, treat it as a separately justified feature, not a relabelled settings form.

**Trade-off:** less evocative wording, but a more accurate expectation. Display only statuses the application can actually verify. No playlist mutations were exercised in this audit.

### M4 — Historical views need clearer comparison context and small layout refinements

**Observed · Medium impact · Interface · Evidence 03–05, 27, 28.** “Artists on the rise” names artists without showing the comparison or size of change. Rediscovery gaps are abbreviated as a large integer followed by “d”. All time uses the same large chart frame with only six annual bars occupying part of the row. Future months in the current-year chart have no records, which should not be read as a measured listening decline. The next-month empty state is informative but still keeps four zero tiles and multiple empty sections.

**Change:** name the comparison (“More plays than the previous month”) and show the two counts or a small delta on expansion. Express long gaps as years/months with an exact duration available secondarily. Size the annual grid to the number of years. Mark the current month/year as partial and future periods as not yet elapsed. For a wholly empty period, keep period navigation and one useful empty state, with a return-to-current-period action; collapse repeated zero panels.

**Trade-off:** some extra dynamic context, justified because it changes how the numbers are interpreted. Do not add permanent explanatory paragraphs. Numeric sorting and the responsive six-column month chart worked in this run and should be preserved.

## Findings: Weekly Rhythm and Home

### W1 — Weekly focus links discard the exact work item the user selected

**Observed · High impact · Interaction/routing · Evidence 07, 10, 11, 31, 38.** Clicking a project action from weekly focus opens /projects with the entire project grid. The project is closed and the user must find and open it again before acting. The source action panel then does expose its This week state. Task focus links similarly identify a generic /tasks route; the project handoff was the one directly exercised.

**Change:** open the owning project and selected action directly, scroll/focus it, and retain a clear return to the weekly view. For tasks, open and focus the selected task. Use stable item references already available in the domain model; a second copy or new planning database is unnecessary. Make the same source-opening behavior reusable by Home and Agenda.

**Trade-off:** routing/state restoration work is greater than a styling change, but it removes a repeated navigation task. Acceptance should include browser Back and an item that is outside the initial viewport or current filter.

### W2 — Home and Rhythm use the same weekly label for different sets of work

**Observed · High impact · Product integration · Evidence 07, 20, 23, 30, 31.** Home's This week contains dated work and an overdue task. Rhythm also contains undated weekly focus and recurring intentions. An undated focused project action visible in Rhythm is absent from Home. The full-week link is useful, but the compact view does not advertise what it leaves out. This weakens the purpose of choosing flexible work without giving it an artificial date.

**Change:** the smallest honest fix is to call Home's section “Dated work” and link clearly to “This week”. The more useful follow-up is one compact shared weekly summary: dated/overdue work first, then one or two selected undated focus items, plus a quiet recurring-intention summary when it adds value. Use the same Saturday–Friday boundaries. Avoid a second planning dashboard or four new summary cards.

**Trade-off:** adding flexible focus increases Home's content and requires an explicit selection limit. Decide that limit before implementation. Do not imply Home is a complete weekly plan unless it is.

### W3 — Rhythm's screen order favours counters over planning; useful source metadata is lost

**Observed · High impact on phone · Interface with a small product decision · Evidence 07–09, 30, 31, 37.** On phone, recurring Rhythm starts around y=149, Weekly focus around y=579, Fixed commitments around y=843 and Dated work around y=981. Each intention has an outer grouping card, its own card, progress, a divider and always-visible Edit/Pause controls. The same project action appears in focus and dated work, with different metadata. A task flagged overdue on Home loses that date/status in weekly focus. An elapsed commitment remains in Fixed commitments without a past/upcoming distinction.

**Change:** put a compact upcoming/dated constraint summary near the week heading, make selected work the main working list, and place recurring intentions in compact rows afterward. Keep dates and overdue meaning when an item appears in focus. A focused dated item can appear once in the working list with both properties, while remaining canonical in Tasks/Projects. Retain elapsed commitments under a collapsible Earlier this week section when they help reflection. Put Edit/Pause behind a small per-row menu, keeping Log done immediately available. Show only title and target by default in the new-rhythm form; reveal optional details progressively.

**Trade-off:** logging recurring intentions may move lower; keep a direct section shortcut if repeated use shows that logging is the main job. Do not replace weekly counts with daily streaks or invent a scheduling grid. The 0/3 state is a progress fact, not evidence that the user has failed or abandoned the feature.

### W4 — Calendar context lacks visible coverage/freshness at the planning decision

**Observed · Medium impact · Integration trust/interface · Evidence 07, 31, 12.** Rhythm shows Fixed commitments, but no source label, last-read time, selected-calendar coverage or explicit limitation is visible beside that section. Agenda shows calendar source names, but the user must leave the planning view to inspect them. This audit cannot establish whether all relevant calendar sources were loaded.

**Change:** show a quiet source/freshness line with an expandable coverage explanation, for example “Selected Google calendars · checked [time]”. Distinguish “No upcoming events from selected sources” from “No commitments”. Keep PCC-projected dated work out of external commitments to avoid double counting. Link to connection details only when needed.

**Trade-off:** one small state line and source selection work if that is not already supported. Never infer free time or capacity from an incomplete calendar feed. The exact fields depend on the existing integration; do not invent a live completeness guarantee.

## Findings: Agenda

### A1 — Agenda's unique value is future commitments, not a second editor for PCC work

**Observed · High product impact · Product decision · Evidence 12, 13, 32.** Agenda mixes PCC-projected tasks/actions, external timed events and holiday/observance entries in a feed extending several months ahead. There is no visible range/source filter in the inspected view. A PCC project action repeats its source in multiple lines and offers only Open in Google Calendar. On phone, two dated work cards consume almost the whole viewport before the next group. New event opens an inline form, but its destination calendar is not explained in that form.

**Recommendation:** do not independently redesign Agenda. First move the relevant upcoming commitments and source controls into This week, and make PCC-owned records open their PCC sources. Preserve future browsing through a compact “Upcoming” mode or secondary link, because current-week Rhythm alone does not replace Agenda's longer horizon. Use Google Calendar for detailed calendar browsing and event editing. If event creation stays in PCC, explicitly name its destination and ownership before Create event.

**Trade-off:** retiring a top-level destination removes one familiar entry point and may make distant dates harder to find. Keep the current route as a redirect/secondary Upcoming view until the replacement demonstrably covers both next-week and farther-future needs. Validate issue #72's product decision with actual use before removing the page. This is a recommendation, not evidence that the user never needs Agenda.

### A2 — Agenda's event density obscures the useful content

**Observed · Medium impact · Interface · Evidence 12, 32.** Long repeated phrases such as the PCC source description, full calendar identity, imported descriptions and a separate action button produce tall cards for small records. Source information is useful; repeating it is not.

**Change:** group by day and use rows: time or date type, title, one compact source/owner line, then an overflow action. Expand description and secondary metadata on demand. Keep real all-day events distinct from PCC date-only check-ins; an all-day Calendar projection does not mean the task occupies the entire day. Offer source visibility controls without silently hiding potentially important holidays.

**Trade-off:** expanded metadata takes another tap. In return, the phone shows enough upcoming items to compare the week. This refinement can be applied to the eventual Upcoming/This week list rather than polishing the current page twice.

## Internal references and secondary findings

### R1 — Preserve Library's browsing strengths; reduce editing ceremony only when useful

**Observed · Lower priority · Evidence 17–19, 33.** The cover grid and separated shelves work. Series' resume state is especially purposeful. Opening a book immediately opens the complete edit form, including cover management, metadata, shelf placement, multiple rating dimensions and reflection. This is heavier than a simple “where was I?” or “what did I think?” visit.

**Direction:** keep the shelf structure and covers. Consider a compact read/detail surface or a collapsed Advanced section only if ordinary usage shows editing friction. A separate read mode adds another transition for frequent editors, so this should not outrank source handoffs or Music. No generic restyle is warranted.

### R2 — Expenses is a useful density reference, with data-coverage caveats

**Observed · Medium/low priority · Evidence 14–16, 34.** Filtered results are coherent, category rows align amounts, and the chart has a textual breakdown. The missing-recorded-income condition can still produce over-target messaging, and calendar-range averages do not establish a complete recording history. The public regression case should use fictional records and a range containing months with no entries. No production income, spending amounts or recording dates are reproduced here.

**Change:** when no income is recorded, keep expense totals but replace over-target judgments with “No income recorded; targets unavailable”. Name an average's denominator (“per calendar month in selected range”) or offer a recording-period view. Do not equate no entries with verified zero real-world spending, and do not impose a reconciliation workflow.

**Trade-off:** fewer budget signals in sparse data. The trade is more honest interpretation, consistent with PCC accepting incomplete manual records.

### R3 — Keep visual consistency work narrow

**Observed · Lower priority · Evidence 02, 07, 12, 14, 17, 20.** Shared surfaces and semantic overdue/success colours already establish continuity. Width, tab placement, optional-field density and amount of card nesting vary by space. Some variation serves the task: a media shelf should not look like a task list. The inconsistency to remove is repeated framing around simple rows and controls, not every difference in layout.

**Change:** define a small shared set: page header, page-level tabs, period/filter row, compact metric group, list row, expandable detail and empty state. Use existing type and theme tokens. Keep dark filled controls for selected modes and important actions, reducing their simultaneous prominence where a page currently has several competing primary-looking controls.

## Accessibility and interaction findings

Confirmed concerns: the 12-pixel-high Spaces link; truncation of important destinations at 320 pixels; long task/focus titles that cannot be read fully until leaving or expanding; dense, repetitive event metadata. These affect low-vision users, touch accuracy and ordinary scanning as well as visual polish.

Confirmed strengths: accessible names for the sampled navigation/actions; visible keyboard focus on the Music tab switch; Enter activation; meaningful chart-button labels; target sizes in the sampled responsive month chart; no document horizontal overflow in the measured 320-pixel Spaces view or 390-pixel Music and Rhythm views.

Risks requiring further testing: muted-text contrast on every theme, full keyboard traversal and focus return from panels, screen-reader behavior for repeated Remove/Edit controls and expandable task rows, expanded-state announcements, 200–400% zoom, reduced motion, focus visibility behind the dock, software-keyboard occlusion and real iOS/Android safe areas. The screenshot/DOM checks do not establish WCAG conformance. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) are the relevant acceptance references.

## Prioritized improvement backlog

Priority is an audit recommendation, not an existing GitHub issue label. S/M/L are relative sizes: S is a focused component/copy change, M spans a few screens or routing/state behavior, L is an integration/product slice. They are not time estimates. Items with product choices should be agreed before implementation.

| Rank | Recommendation | Impact | Effort | Layer | Acceptance check |
| --- | --- | --- | --- | --- | --- |
| 1 | N1: Give Spaces a labelled, comfortable target | High | S–M | Interface/accessibility | Reach all unpinned spaces reliably at 320/390; no Capture overlap |
| 2 | W1: Open the selected source task/action directly | High | M | Routing/interaction | Rhythm/Home select exact item; Back restores weekly context |
| 3 | N2: Preserve full launcher destination names | High at narrow widths | S | Responsive layout | No ambiguous label fragments at 320; touch targets maintained |
| 4 | M1: Put Music rankings before secondary panels | High | M | Interface | At 390×844, expose ranked content in first screen without hiding controls |
| 5 | W2: Align Home's weekly summary with Rhythm | High | M | Product integration | Undated selected work stays visible without inventing dates |
| 6 | W3: Reorder and compact the weekly planning view | High | M | Interface/product | Constraints visible early; focus preserves dates/status; less nested chrome |
| 7 | W4: Make Calendar coverage/freshness visible | Medium–high | M | Integration trust | Empty selected-source feed never implies verified free time |
| 8 | A1: Decide Agenda's role and retain future horizon | High, usage-dependent | M–L | Product | Current week, next week and distant commitments all remain reachable |
| 9 | M2: Match genre prominence to coverage | Medium–high | S–M | Data presentation | Coverage denominator/unit clear beside any chart |
| 10 | M3: Clarify playlist setup and discovery terminology | Medium | S | Copy/navigation | Settings tab describes setup; fixed discovery threshold not conflated |
| 11 | A2: Replace event cards with compact expandable rows | Medium | M | Interface | More meaningful upcoming entries visible; source/details still available |
| 12 | M4: Improve historical comparisons and empty periods | Medium | S–M | Interface/data context | Comparison baseline, partial periods and return-to-current action clear |
| 13 | R2: Handle missing recorded income and sparse averages | Medium | S–M | Data presentation | No over-target judgment from absent income; average denominator explicit |
| 14 | N3/R3: Align terminology and reusable screen patterns | Medium | S–M | Shared system | Same destination names; no dead Settings promise; themes preserved |
| 15 | R1: Test lighter Library details before changing them | Lower | M | Product interaction | Common read/resume job improves without adding editor friction |

Recommended first implementation slice: ranks 1–3, then Music hierarchy. Discuss the Home/Rhythm/Agenda product changes before bundling them into that work. Do not hold the straightforward fixes behind the larger Calendar decision.

## Detailed design proposals

These are design specifications for discussion, not implemented screens or visually tested mockups. Example labels are fictional. Dimensions below are starting constraints to test against the existing design system, not a request for new typography or a wholesale token replacement.

### Proposal 1 — Music: a compact listening-history view

**Primary question:** What did I listen to in the selected period, and what is worth revisiting?

**Phone reading order:** Music title with a secondary setup action; a compact Month/Year/All time switch; one period row with previous, editable period and next; a lightly grouped two-by-two metric summary; a Songs/Artists switch and six ranked rows; an expansion action; rediscovery; an expandable genre summary; then historical phases. In Year/All time, place the useful timeline near the summary without pushing both rankings and their view switch out of reach.

**Rows:** rank, title/artist or artist name, right-aligned play count. Use tabular numerals and shared count alignment. Allow two lines for long song titles. Keep Spotify as an explicit external action rather than making every surface behave like playback. An artist row is a readable row unless artist drill-down is actually supported; do not style it as a false link.

**Desktop:** keep Songs and Artists in two columns with matched headers; show a concise top set in each and expand independently. Put rediscovery in a small secondary section rather than a full-width dominant banner. The annual chart should use its full available width according to actual year count. Reserve genre space in proportion to useful coverage.

**Copy examples:** “Known listening time”; “Some plays excluded: duration unavailable”; “Genres among tagged plays · [coverage]%”; “More plays than last month”; “Playlist setup”. Keep the existing unknown-duration distinction. Do not turn sparse tags into a taste profile or mood claim.

**Review gate:** first ranked rows visible at 390×844; full names and counts fit at 320; same period governs every section; month/year drill-down and keyboard focus still work; empty periods have one coherent recovery path. Compare against evidence 02, 04, 05, 26–29 and 36.

### Proposal 2 — This week: one planning surface with compact recurring progress

**Primary question:** What needs room in this week, and which dates constrain it?

**Phone reading order:** This week and the exact Saturday–Friday dates; a compact upcoming-commitment/dated-work summary; Focus work; recurring Rhythm rows; optional Earlier this week; then carry-forward decisions only when they exist. Put Add work beside Focus, making it the natural way to choose existing work. Keep New rhythm secondary to the weekly plan.

**Working row:** full task/action title, owner, and meaningful date/status. A focused dated item carries a small Focus marker in a single row rather than requiring the user to reconcile two versions. A tap opens the exact canonical source. Removing from focus is a secondary action explicitly named “Remove from this week”, not an ambiguous Remove. Existing source completion remains the authoritative completion path.

**Recurring row:** title, compact 2/3 progress, and “Log done”. Optional time/duration appears only when present and useful. A secondary menu contains Edit, Pause and completion-history access. Do not show disabled-looking decorative progress as a new interactive target unless it really edits a completion. Minimal creation asks only name and weekly target, with an Optional details disclosure.

**Desktop:** use selected work as the main column; upcoming constraints and compact recurring progress form the secondary column. This avoids giving a pair of recurring intentions most of the page while concrete project work sits below them.

**Home:** reuse the same weekly selector and source-opening behavior. Start with the honest smaller label change if cross-space selection needs more discussion. A later compact list can include selected undated focus without adding another dashboard surface.

**Review gate:** users can choose undated work without setting fake dates, open it directly, understand source-calendar limits, and distinguish logging a rhythm from completing a task. Validate carry-forward and undo with fictional local test data; those writes were not exercised live. Compare evidence 07–11, 20, 23, 30, 31, 37, 38.

### Proposal 3 — Agenda: retain an Upcoming horizon inside the planning experience

**Primary question:** What commitments beyond this week do I need to anticipate?

Begin with an Upcoming mode alongside This week, or a secondary Upcoming link within it. Use day groups and compact rows with source identity. Offer a bounded range and source visibility controls. Keep the latest source-read state nearby. A PCC action opens PCC; a genuine Calendar event offers Open in Google Calendar. Distinguish date-only work from all-day events.

Do not remove the existing Agenda route immediately. First let it point to this combined experience and confirm that distant appointments are still easy to find. Remove its default pin only as an explicit navigation preference/product change. If native event capture offers no meaningful advantage over Google Calendar, replace New event with an external Calendar action rather than maintaining a second editor. If it remains, name the destination calendar and save semantics before submission.

**Decision test:** over ordinary use, does the combined view answer current-week and farther-future planning needs without opening the old feed? Does it reduce duplicate task browsing? If yes, retire the standalone space. If no, retain a compact Upcoming destination with that distinct job. Screenshot evidence alone cannot answer frequency-of-use questions.

## Recommended GitHub design workflow

1. **Describe one user job and freeze a small scope.** For example, “Open a selected action from This week and return to the same week.” Record before/after behavior and anything requiring a product choice.
2. **Capture before touching code.** Use repeatable desktop and phone viewports and the relevant normal, expanded, empty and long-title states. Use fictional representative records in development. The live screenshots in this report should not enter the public repository, issues or PRs.
3. **Write a short design contract.** Specify reading order, primary/secondary actions, information that must remain visible, source ownership, semantic colour meaning and expected behavior at 320 pixels. Reuse existing components and theme tokens.
4. **Review the proposed screen before broad implementation.** A small visual comparison or focused mock is enough for hierarchy changes. Do not ask an agent to “make it modern” across the whole app. For product changes, agree on the job and ownership first.
5. **Implement one independently reviewable slice.** Preserve canonical domain actions, authentication boundaries and current integrations. Keep the existing no-autonomous-write constraints. Avoid a new component library merely for a cosmetic pass.
6. **Inspect the rendered result at the same states and sizes.** Put before and after side by side. Test full labels, long titles, nonzero and empty data, keyboard focus, source links, browser Back, dock clearance and the optional-field expansion. Include at least one light and one dark theme on layout-affecting work; run contrast/semantic-state checks across the full theme set when tokens change.
7. **Run meaningful repository checks.** Follow AGENTS.md for the change's lint, tests, build and Compose validation. Browser screenshots complement those checks; they do not replace functional tests. Avoid tests that merely repeat styling internals.
8. **Write a concise PR description.** State the original user problem, resulting behavior, screenshot/state coverage, remaining limits and any intentional trade-off. Include only fictional examples and safe screenshots in public review.
9. **Review in real use after merge.** Ask whether the specific friction actually decreased. Update current product documents when a role or flow changes, rather than treating an old redesign plan as the deployed truth.

Useful research inputs: Taste Skill's app-screen guidance supports quieter framing, aligned data and browser-based self-review; it is a reference, not a style to impose. Anthropic's Frontend Design guidance supports brief-specific choices and removing visual decoration that does not help the job. Neither justifies replacing PCC's themes or applying a marketing-page aesthetic. [Taste Skill](https://github.com/Leonxlnx/taste-skill), [app-screen guidance](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/references/app-screens.md), [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).

## Evidence limits

The inspected Review state was completed/closed; current-week submission, generated Rhythm review panels and the week-transition carry-forward flow could not be validated. History was reachable, but personal reflection contents were not used as design findings. No completion/undo, pause, focus mutation, event creation, transaction saving, playlist append, enrichment, OAuth, offline recovery or failure injection was performed. The tests do not establish persistence reliability or integration completeness.

The month picker was exercised through previous/next and year-chart drill-down. A synthetic browser fill of its native input did not update the displayed period; this was not treated as a confirmed product defect without a real-user reproduction. The empty-period evidence uses the working Next period button.

No physical-device, software-keyboard, touch-gesture or PWA safe-area test was run. No alternate theme, full screen-reader session, complete keyboard audit or contrast measurement was performed. Loading feedback was observed transiently; stable loading/error/offline screens were not deliberately produced. Do not infer that those states pass or fail.

All 39 application screenshots were visually inspected in the private audit. This public document contains the findings and capture matrix, not the original image package. The matrix identifies coverage and reproduction states; it is not a screenshot substitute. Reproduce public review images with fictional fixtures before implementation.

Food, Markets, Notes, Thoughts, Inbox processing, Keychain and account-administration flows were outside the detailed pass. Their placement in Spaces was reviewed; their internal workflows were not audited. Books and Series were inspected; Movies was not explored beyond the visible shelf link. The result is comprehensive for the named priority spaces and shared navigation, not certification of every module.

## Repository references

- [Project constraints and public-data rules](https://github.com/teravyte18/personal-control-center/blob/main/AGENTS.md)
- [Interface rules](https://github.com/teravyte18/personal-control-center/blob/main/docs/interface-rules.md)
- [2026 consolidation direction](https://github.com/teravyte18/personal-control-center/blob/main/docs/ux-refresh-2026.md)
- [Product specification](https://github.com/teravyte18/personal-control-center/blob/main/docs/product-spec.md)
- [Roadmap and Agenda decision](https://github.com/teravyte18/personal-control-center/blob/main/docs/roadmap.md)
- [Weekly Rhythm model and validation questions](https://github.com/teravyte18/personal-control-center/blob/main/docs/weekly-rhythm.md)
- [Music data, archive and enrichment boundaries](https://github.com/teravyte18/personal-control-center/blob/main/docs/spotify-music.md)


## Companion documents

- [Public-safe evidence matrix and fictional capture recipe](ui-ux-audit-2026-10-evidence.md)
- [Prioritized backlog CSV](ui-ux-audit-2026-10-backlog.csv)
- [Repeatable visual-review workflow](visual-review-workflow.md)

Recommendations in this audit are not accepted requirements or delivered behavior. Keep product-level choices, especially the Home/Rhythm/Agenda role, pending explicit review.
