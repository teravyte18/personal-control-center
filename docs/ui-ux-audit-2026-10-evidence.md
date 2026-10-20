# PCC audit evidence manifest — reassessment

**Run:** 20 October 2026. **Current set:** 23 fresh accepted captures, S01–S23. The earlier 39-view set belongs to the initial audit and is not the evidentiary basis of this reassessment. The public report supersedes its earlier conclusions where the brief or evidence changed.

The original screenshots and DOM snapshots contain personal records. AGENTS.md requires the repository and PR to be treated as public, so neither originals nor record-specific URLs are committed. This matrix is an inspection index, not a substitute for the private screenshot evidence. A local companion report renders the inspected originals for the owner.

Viewports below are requested CSS viewport dimensions; scrollbar/capture raster dimensions can differ. Desktop IAB layout emulation does not certify touch behavior. Two mistimed/clipped captures were rejected and replaced before acceptance: Agenda initially showed the previous route, and the first desktop Rhythm capture was clipped. The final saved versions were inspected. Amount focus was initially investigated as a risk, then rejected as a no-focus defect after its group border visibly changed.

| Capture | Viewport | State | Findings / outcome |
| --- | --- | --- | --- |
| S01 | 390 x 844 | Music month overview | A02, A03, A05, A18 |
| S02 | 390 x 844 | Archive form, not saved | A09, A17 |
| S03 | 390 x 844 | Weekly overview with two intentions | A04, A06, A07, A13 |
| S04 | 390 x 844 | Project action collection destination | A04 |
| S05 | 390 x 844 | New rhythm form, cancelled | A09 |
| S06 | 390 x 844 | Loaded Agenda listing | A08 |
| S07 | 390 x 844 | Capture and dated week subset | A07, A18 |
| S08 | 390 x 844 | Spaces directory | A03, A10 |
| S09 | 320 x 740 | Narrow directory label truncation | A10 |
| S10 | 390 x 844 | Book shelf | A14 |
| S11 | 390 x 844 | Full-screen book editor | A01, A09, A14 |
| S12 | 390 x 844 | Month with no income entered | A11, A18 |
| S13 | 390 x 844 | Empty new-transaction form | Positive labelled entry |
| S14 | 390 x 844 | Amount focused by Tab | False positive rejected: group border changes |
| S15 | 390 x 844 | Insights filters and average | A12 |
| S16 | 390 x 844 | Completed review state | Positive clear completion; active form untested |
| S17 | 390 x 844 | Focus on covered dock after final editor control | A01; DOM corroboration |
| S18 | 1440 x 1000 | Music month desktop | A05, A18 |
| S19 | 1440 x 1000 | Music year and labelled drill-down | Positive chart interaction |
| S20 | 390 x 844 | Empty future month after drill-down | Positive honest empty state; A17 |
| S21 | 1440 x 1000 | Weekly desktop columns | A06, A13, A18 |
| S22 | 1440 x 1000 | Desktop Home composition | A07, A18 |
| S23 | 390 x 844 | Review dock link keyboard focus | Positive visible browser focus; A02 |

## Reproduce safely with fictional records

Use the browser-only development mode or an isolated test account, following [browser-only development](browser-only-development.md). Do not import production exports or copy personal examples into fixtures.

1. Seed several projects, with multiple open actions, one long title, one undated action selected as weekly focus, one dated focus action and one Waiting project. Add dated/overdue standalone tasks. Confirm the selected source rather than copying real titles.
2. Add zero, two and several recurring intentions. Add a fictional timed Calendar commitment only in a test integration if exercising Calendar ownership; otherwise label integration-dependent checks unavailable. Compare phone ordering and desktop columns.
3. Open a weekly project-action link. Verify exact selection and Back behavior. Open and cancel the New rhythm form. Measure editable text with computed styles; test iPhone behavior separately on hardware.
4. Open All Spaces at 390px and 320px. Check full names, target rectangles and adjacent-control spacing. Test inactive/active/focus contrast for each retained theme in the isolated environment.
5. Use synthetic music history with populated, sparse and empty periods, long song/artist names and incomplete tags/durations. Check month/year/all-time controls, numerical order, expansion state and chart drill-down. Do not call playlist-save or permission-upgrade actions against the production account.
6. Add a fictional book, open its editor, then Tab from Delete book without activating it. The observed defect sends focus into covered navigation. Escape should close the editor; after a fix, focus should return to its invoker. A DOM role count supports the screenshot but does not replace a screen-reader check.
7. Use fictional expense periods with spending but no entered income, a deliberate zero-income case, positive income and sparse histories. Verify coverage language and denominator without changing arithmetic silently. Keyboard through Amount and Date separately; preserve the working Amount group focus indicator.
8. Inspect completed and due Weekly Review states in a test environment. This live run covered only the completed entry state and did not request notification permission or submit a review.

## Evidence and execution limits

- Fresh screenshots, DOM snapshots, measured geometry and source references are distinct kinds of evidence. A screenshot alone does not prove state persistence, data isolation, correct arithmetic or accessibility conformance.
- Default theme only was rendered in this run. No physical phone, screen reader, real touch gesture, keyboard-open device state, offline mutation, destructive action or deployment was tested.
- Static source detector: five warnings, exit 2; findings and false-positive triage are in the report. No live injection or overlay was attempted.
- Reviewed source revision is recorded in the report. No exact deployment revision match was established.
