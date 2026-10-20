# UI/UX audit evidence matrix � October 2026

**Status: public-safe capture inventory; original evidence remains private.**

The live audit on 20 October captured and visually inspected the following 39 views. This matrix records what was inspected and its assessed health. It deliberately contains no production screenshot, DOM dump, personal record title, account identifier, financial value, listening-history value, private URL or machine path. It does not allow an outside reviewer to verify pixel findings without reproducing them.

Viewports were 1440 � 1000 for desktop, 390 � 844 for phone, and 320 � 740 for narrow reflow. These are browser CSS viewports, not physical-device validation. Recommendations and limits are in the [audit](ui-ux-audit-2026-10.md).

## Captured states

| Evidence | View | Viewport | General health / limit |
| --- | --- | --- | --- |
| 01 | Desktop Spaces launcher | Desktop | Generally sound; lower hierarchy needs refinement |
| 02 | Music month overview | Desktop | Needs hierarchy refinement |
| 03 | Expanded Music rankings and phases | Desktop | Functional; presentation refinements |
| 04 | Music year overview | Desktop | Functional; comparison context needs refinement |
| 05 | Music all-time overview | Desktop | Functional; chart sizing and context need refinement |
| 06 | Music playlist setup | Desktop | Functional inspection; naming needs refinement |
| 07 | Weekly Rhythm overview | Desktop | Useful concept; reading order needs refinement |
| 08 | Add existing work to weekly focus | Desktop | Picker reachable; save not tested |
| 09 | New rhythm form | Desktop | Form reachable; progressive disclosure recommended |
| 10 | Focus link to Projects | Desktop | Context lost; exact source is not opened |
| 11 | Project action panel | Desktop | This week state visible; writes not tested |
| 12 | Agenda feed | Desktop | Needs role and density decisions |
| 13 | Agenda new-event form | Desktop | Form reachable; destination unclear; save not tested |
| 14 | Expenses Month reference | Desktop | Strong structure; missing-income messaging needs refinement |
| 15 | Expenses Insights reference | Desktop | Strong filter/result hierarchy; coverage caveat |
| 16 | Filtered Expenses Insights | Desktop | Category filtering works |
| 17 | Library Books reference | Desktop | Strong browsing structure |
| 18 | Library book panel | Desktop | Reachable; editing surface is heavy for simple reading |
| 19 | Library Series reference | Desktop | Strong resume-focused default |
| 20 | Home desktop | Desktop | Clear capture and dated work; weekly scope incomplete |
| 21 | Closed Review period | Desktop | Clear completed state; current-week review untested |
| 22 | Tasks desktop | Desktop | Compact rows; focus controls hidden inside expansion |
| 23 | Home phone | Phone | Reflows; Spaces discoverability concern |
| 24 | Spaces phone | Phone | Grouped launcher works; long labels need care |
| 25 | Phone navigation configuration | Phone | Reachable; no preference changes tested |
| 26 | Music month phone | Phone | Primary rankings below first viewport |
| 27 | Music year phone | Phone | Six-column wrap works; sampled target size adequate |
| 28 | Music empty period phone | Phone | Useful empty guidance; repeated empty scaffolding |
| 29 | Music playlist setup phone | Phone | Reflows; naming and hierarchy refinements |
| 30 | Rhythm phone overview | Phone | Constraints below the fold |
| 31 | Rhythm focus and commitments phone | Phone | Source state and duplicate presentation need refinement |
| 32 | Agenda phone | Phone | Tall repeated cards; weak scan density |
| 33 | Library phone | Phone | Strong two-column browsing and visible controls |
| 34 | Expenses phone | Phone | Reflows; missing-recorded-income condition needs careful messaging |
| 35 | Spaces at 320 pixels | 320 px | Destination names become ambiguous |
| 36 | Music at 320 pixels | 320 px | Reflows; hierarchy remains costly |
| 37 | Rhythm at 320 pixels | 320 px | Reflows; primary focus below first viewport |
| 38 | Expanded task phone | Phone | Weekly-focus action reachable; expansion is tall |
| 39 | Music keyboard focus | Phone | Tab, visible focus and Enter activation passed smoke test |

## Fictional reproduction dataset

Use a deliberate local/development fixture set, never an export or screenshot of a real account. Keep test dates relative to a fixed test clock so week boundaries, elapsed events and overdue states are repeatable.

- **Navigation:** default theme, the same bounded desktop pins and four phone shortcuts; include every launcher destination and its longest labels.
- **Tasks/projects:** a fictional `Example project` with a long named action, a dated focused action, an undated focus item, an overdue task and an ordinary future task. Ensure one selected action is outside the initial viewport or filter. Test the Saturday�Friday transition with explicit fixtures, not production clock changes.
- **Rhythm:** two fictional recurring intentions with short/long names, optional metadata and progress at zero, partial and complete. Include paused and empty states in the follow-up review; these were not all exercised live.
- **Calendar:** fictional past, upcoming and distant timed commitments; a true all-day event, a date-only PCC projection, a holiday and incomplete selected-source coverage. Keep ownership labels distinct and do not infer free time from missing sources.
- **Music:** fictional song/artist labels and internally consistent counts, long collaboration names, unknown durations, sparse genre tags, year/month drill-down, a partial current period and an empty future period. Use stubbed integrations; do not call playlist reconciliation or enrichment while merely capturing a visual reference.
- **Expenses:** fictional categories and transactions, no-recorded-income and populated-income conditions, a range with unrecorded months, and a category filter. The fixture values should reconcile and remain clearly synthetic.
- **Library:** fictional covers/titles, owned and wishlist books, a currently reading item, a long title, an item with optional ratings and a series with resume progress. Use licensed or generated test artwork; no private uploaded covers.
- **Review:** fictional closed and draft periods, sparse generated context, long reflection placeholders and a carry-forward decision. Original live inspection could not validate current-week submission or carry-forward writes.

## Capture acceptance

1. Capture normal and relevant expanded/empty states at the same fixed sizes as the baseline.
2. Open every saved image and verify the route, state, readable content and viewport. Reject stale-route, blank or half-loaded captures.
3. Store each screenshot with its state description and a short finding. A DOM dump alone is not visual evidence.
4. Publish only fictional images after checking visible text, metadata, account labels, URLs and browser chrome for private information.
5. Check keyboard focus, source handoff, browser Back and narrow labels in the rendered UI. Add physical-phone, software-keyboard, safe-area, zoom and screen-reader coverage before claiming those pass.

Do not recreate private screenshots from memory, reuse them as public fixtures, or describe this inventory as a full accessibility certification.
