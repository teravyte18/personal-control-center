# Feedback-driven UI polish

First pass, 29 October 2026. Stacked on the unmerged Focus + Atlas usage trial. This is a partial implementation of the desktop/phone feedback backlog, not approval to merge or a claim that every audited issue is resolved. No Figma file is changed.

## Implemented

- All Spaces restores consistent icons, bounded tiles and internal padding; unavailable destinations no longer compete with working spaces.
- Week groups each section on a bounded surface with dividers. Habit secondary commands are quieter. Section shortcuts use matching names and jump-link styling. Focus removal moves to an explicit per-item menu; long focus titles wrap. Dated work identifies overdue dates. The footer becomes Open Agenda.
- Home groups near-term work and weekly context. Empty Inbox is a compact status row. Links to Week use the unambiguous Open Week label.
- Tasks provides separate real completion checkboxes and Edit buttons. Rows have dividers, overdue text and desktop selection treatment. The detail editor explains its existing save-on-blur/immediate-save behaviour; redundant summary completion is removed.
- Expense cards regain 16px phone / 20px wide padding and form three columns on wider screens. Percentages and meters explicitly mean share of outflows; the separate income-based comparison reads above/below target. Essentials/Fun above target receive semantic emphasis. Domain calculations, the Fun Fund and stored data are unchanged.
- Phone navigation keeps all four configured pins, Capture and Spaces in one row. Capture artwork remains, with a quieter background. Home is explicit in the compact header/desktop brand link. Header/dock boundaries are visible.
- Keyboard detection uses visual-viewport geometry and editing focus, restores navigation after dismissal, ignores pinch zoom, and resets its baseline on substantial width changes. The focused control is scrolled into view when the keyboard is detected. This is an enhancement: physical-device validation is still required, including browsers without Visual Viewport support.
- Shared neutral borders distinguish controls/dividers from theme accents. Phone inputs use 16px text. Existing themes, artwork, semantic status colours and forced-colours checkbox support remain.
- Project groups have a shared desktop boundary; phone project outcome and next-action details are separated. Other open actions are grouped and overdue dates are explicit.
- Desktop Agenda uses one chronological column rather than alternating dates across columns.

No authentication, API, persistence, integration, schema, dependency, Keychain or deployment configuration changes are included. Existing shared actions still own completion and record mutations.

## Deferred

- Home calendar commitments and deeper Home/Capture information architecture.
- A unified treatment of overlapping Weekly focus/Dated work, direct project-action completion with preserved completion-note flows, and source links that select the precise project action.
- Library sort controls, reading-first options, redundant desktop detail panel and mobile filter density.
- Music period clipping/duplication, rankings order and desktop width balance.
- Review closed-period wording/history navigation.
- Agenda source-label density, native task links and deeper calendar ownership decisions.
- Notes density, broader save-status positioning and the remaining copy/interaction consistency pass.
- Full screen-reader/keyboard/contrast and responsive visual certification across all themes and workflows.

## Validation

- ESLint, TypeScript and the production build pass. All 191 tests pass (189 existing domain/security/deployment tests plus two keyboard-geometry regressions). `git diff --check` passes.
- Keyboard geometry regressions cover dismissal, toolbar changes, focus loss, pinch zoom and rotation. Browser geometry tests do not prove physical keyboard behaviour.
- Local Node 24 uses `node --experimental-strip-types --test tests/*.test.ts`; CI uses Node 22 and the normal `npm test` command.
- Docker is unavailable in the implementation environment, so local base/Funnel Compose checks could not run. The PR's existing Production stack CI remains the Compose validation path.
- The cloud browser cannot reach the isolated local Next server. No new browser screenshots or mobile visual pass are claimed. The owner-provided phone screenshots and earlier desktop inspection ground the changes, but are not after-change validation. Private evidence remains outside Git.

## Device acceptance checklist

Check narrow phone, ordinary phone, laptop and wide desktop, with Default plus a dark theme, before treating this pass as visually accepted:

1. All four saved pins, Capture and Spaces remain usable; labels fit, touch targets are comfortable, the final page row can scroll clear of the dock, and current navigation is visible.
2. Create/edit a task and project with the software keyboard open; test dismissal, orientation change, date fields, final submission and returning to the list. Check navigation remains available after typing ends.
3. Complete/reopen a task from its checkbox and detail action; verify Completed/Open views, source links, weekly resolution and persistence.
4. Inspect Week sections, empty states, habit Log/Undo/Manage, history, menu removal, carry-forward, long titles and overdue dates.
5. Inspect a no-income expense month, above/below targets and Future You allocations; confirm the percentage is understood as spending composition and transactions remain reachable.
6. Inspect project outcomes/actions, one/many/no actions, desktop grouping and mobile views. Confirm independent action history/completion remains intact.
7. Check keyboard focus and forced colours; inspect light/dark contrast and all theme Capture artwork. Existing themes must not change data behaviour.

Deploy/rollback through the existing trial process only after reviewing the PR. No database restore or volume removal is needed to change UI branches.
