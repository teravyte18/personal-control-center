# Feedback-driven UI polish

Updated 30 October 2026. This document records the feedback-driven polish of Focus + Atlas on phone and desktop. The original UI (#102), P1 (#103) and P2 (#105) are merged into main. A merge is not evidence of production deployment or visual/device acceptance. No Figma changes were included in these polish PRs.

## Delivery status

| Phase | Status | Main result |
| --- | --- | --- |
| [P1 / #103](https://github.com/teravyte18/personal-control-center/pull/103) | Implemented and merged | Visible hierarchy, padding, icons, task controls, compact header and centred five-item phone dock |
| [P2 / #105](https://github.com/teravyte18/personal-control-center/pull/105) | Implemented and merged | Source navigation and completion flows, Library sorting, Music ordering, Calendar context and Review history access |
| [P3](ui-polish-p3.md) | Proposed; not implemented | Remaining planning/product decisions, state and coverage clarity, and visual/accessibility acceptance |

P2 is primarily a workflow/layout refinement. It does not introduce a new palette, typography system, navigation shell or broad redesign. On phone its most obvious checks are the Library sort control, reordered Music rankings and Home commitments. The removed Library preview and Music width changes are most apparent on desktop. Unchanged-looking Expenses and All Spaces are expected: their main changes landed in P1.

The P1/P2 phase names describe delivery batches, not the severity labels in the earlier audit CSV. Audit recommendations may be only partly addressed; use the P3 plan and acceptance checks rather than treating a merged phase as completion of the entire audit.

## P1 — implemented

- All Spaces restores consistent icons, bounded tiles and internal padding; unavailable destinations no longer compete with working spaces.
- Week groups each section on a bounded surface with dividers. Habit secondary commands are quieter. Section shortcuts use matching names and jump-link styling. Focus removal moves to an explicit per-item menu; long focus titles wrap. Dated work identifies overdue dates. The footer becomes Open Agenda.
- Home groups near-term work and weekly context. Empty Inbox is a compact status row. Links to Week use the unambiguous Open Week label.
- Tasks provides separate real completion checkboxes and Edit buttons. Rows have dividers, overdue text and desktop selection treatment. The detail editor explains its existing save-on-blur/immediate-save behaviour; redundant summary completion is removed.
- Expense cards regain 16px phone / 20px wide padding and form three columns on wider screens. Percentages and meters explicitly mean share of outflows; the separate income-based comparison reads above/below target. Essentials/Fun above target receive semantic emphasis. Domain calculations, the Fun Fund and stored data are unchanged.
- Phone navigation keeps all four configured pins with Capture centred in one five-item row. All Spaces replaces Account in the top-right phone header; Account remains available in All Spaces. Capture artwork remains, with a quieter background. Home is explicit in the compact header/desktop brand link. Header/dock boundaries are visible.
- Keyboard detection uses visual-viewport geometry and editing focus, restores navigation after dismissal, ignores pinch zoom, and resets its baseline on substantial width changes. The focused control is scrolled into view when the keyboard is detected. This is an enhancement: physical-device validation is still required, including browsers without Visual Viewport support.
- Shared neutral borders distinguish controls/dividers from theme accents. Phone inputs use 16px text. Existing themes, artwork, semantic status colours and forced-colours checkbox support remain.
- Project groups have a shared desktop boundary; phone project outcome and next-action details are separated. Other open actions are grouped and overdue dates are explicit.
- Desktop Agenda uses one chronological column rather than alternating dates across columns.

P1 included no authentication, API, persistence, integration, schema, Keychain or deployment configuration changes. A separate validation follow-up pins Next.js and eslint-config-next to 16.4.3 because the initial CI dependency audit blocked the existing framework version. Existing shared actions still own completion and record mutations.

## Dependency audit follow-up

The initial PR CI audit reports critical Next.js advisories affecting the existing 16.3.8 pin. The framework and matching lint configuration are updated to 16.4.3, the same-major fixed release recommended by that audit. No audit suppression or security-policy relaxation is introduced. References: [image optimisation](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [typed-array cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Server Actions denial of service](https://github.com/advisories/GHSA-p3m5-59mp-jv5r). Re-run dependency audit, lint, domain/security tests, build and production-stack CI for this dependency revision.

## Remaining work

The former P1 deferred list is superseded by the P2 implementation below and the [P3 plan](ui-polish-p3.md). P2 addressed source links, dated-focus overlap, collection navigation, Music order, Review access, Agenda density and Notes/save-status presentation. It did not complete the broader Home/Capture design, Calendar ownership decisions, a lightweight Library reading flow, view-state recovery, or full visual/accessibility validation.

## P1 validation record

- ESLint, TypeScript and the production build pass. All 191 tests pass (189 existing domain/security/deployment tests plus two keyboard-geometry regressions). `git diff --check` passes.
- Keyboard geometry regressions cover dismissal, toolbar changes, focus loss, pinch zoom and rotation. Browser geometry tests do not prove physical keyboard behaviour.
- Local Node 24 uses `node --experimental-strip-types --test tests/*.test.ts`; CI uses Node 22 and the normal `npm test` command.
- Docker is unavailable in the implementation environment, so local base/Funnel Compose checks could not run. The PR's existing Production stack CI remains the Compose validation path.
- The cloud browser cannot reach the isolated local Next server. No new browser screenshots or mobile visual pass are claimed. The owner-provided phone screenshots and earlier desktop inspection ground the changes, but are not after-change validation. Private evidence remains outside Git.

## Device acceptance checklist

Check narrow phone, ordinary phone, laptop and wide desktop, with Default plus a dark theme, before treating this pass as visually accepted:

1. All four saved pins and the centred Capture action remain usable; All Spaces is available in the header, with Account in that directory; labels fit, touch targets are comfortable, the final page row can scroll clear of the dock, and current navigation is visible.
2. Create/edit a task and project with the software keyboard open; test dismissal, orientation change, date fields, final submission and returning to the list. Check navigation remains available after typing ends.
3. Complete/reopen a task from its checkbox and detail action; verify Completed/Open views, source links, weekly resolution and persistence.
4. Inspect Week sections, empty states, habit Log/Undo/Manage, history, menu removal, carry-forward, long titles and overdue dates.
5. Inspect a no-income expense month, above/below targets and Future You allocations; confirm the percentage is understood as spending composition and transactions remain reachable.
6. Inspect project outcomes/actions, one/many/no actions, desktop grouping and mobile views. Confirm independent action history/completion remains intact.
7. Check keyboard focus and forced colours; inspect light/dark contrast and all theme Capture artwork. Existing themes must not change data behaviour.

For approved production updates use the existing deployment/rollback process; merge status alone does not establish which revision is running. No database restore or volume removal is needed to change UI branches.

## P2 — implemented (originally stacked on P1)

- Home adds up to three upcoming external/Agenda Calendar commitments for the current week, excluding expired events and PCC work already shown elsewhere. Disconnected/error states link to Account or retry; Calendar remains optional.
- Week shows dated focus items once, in Dated work, with their selected-for-Week label and removal menu. Task checkboxes use the shared completion action. Project-action completion links open the existing completion-note/resolution form; visiting a URL never completes work.
- Home, Week and Agenda links select the precise canonical project action. Agenda returns a native source link only for recognised projections in the app-owned calendar; ordinary event descriptions are optional expanded details.
- Library book sorting offers shelf order, reading first, title and score. Up next retains its manual order and shelf membership remains unchanged. Book/Movie/Series cards open their existing full editor on desktop and phone, removing the redundant desktop preview column.
- Music uses the available desktop width, moves rankings before secondary trend/genre sections, and uses one adequately sized period input instead of a duplicated period heading. Random song remains below the main content.
- Review explicitly confirms the saved review and opens that exact entry in History. Notes regain bounded compact rows. Transient saving status no longer shifts page content; offline/errors remain persistent in-flow messages.
- The centred five-item mobile dock and header All Spaces change from P1 are retained.

P2 does not redesign calendar ownership or the Capture information architecture. Full theme/contrast, screen-reader, physical keyboard and responsive visual acceptance remain outstanding. No Figma or production deployment is included. The existing authenticated Calendar read response gains an optional `sourceHref`; persistence, OAuth scopes and projection writes are unchanged.

P2 validation: lint, production build/TypeScript and `git diff --check` pass; all 195 tests pass, including source URL encoding, calendar end-date filtering, work identity and book-sort regressions. Local Node 24 uses the equivalent strip-types test command. Docker remains unavailable locally; production-stack checks run in GitHub CI. After-change browser/device verification remains outstanding.


### P2 checks by screen

| Screen | Visible change / interaction to check | Preserved boundary |
| --- | --- | --- |
| Home | Up to three upcoming commitments; dated rows open their exact source action | Calendar optional; no projected-work duplication |
| Week | Date-bearing focus appears once under Dated work; tasks have completion checkboxes; project-action completion opens its form | Shared mutations and completion notes/resolution retained |
| Library | Sort control; direct editor opening; full-width desktop collection without automatic preview | Manual Up next order, Wishlist membership and all editor fields retained |
| Music | One period input; rankings before trend/genre panels; wider desktop analytics; Random song below | Counts, archive rules and integrations unchanged |
| Agenda | Open task/project action; optional event details; reduced repeated source labels | External events remain external; only app-owned Agenda events editable |
| Review | Saved confirmation and Read completed review opens the matching history entry | Review period and history records unchanged |
| Notes / shared saving | Compact bounded rows; transient saving message does not move content | Autosave, offline/error notices and recovery behavior retained |

For a source-link check, use a fictional project with at least two open actions and select the second from Home, Week and an existing Calendar projection. It must identify the second action. Opening a completion URL must show the form without saving a completion; cancel must leave data unchanged. After submission, check completion history and project resolution through the existing flow.

For a sorting check, use owned, Wishlist, currently reading, zero-rated and unrated books. Reading first must not change shelf membership; a zero score must remain distinct from an absent score; switching sort modes must not reorder the Up next queue. Verify both gallery and list views.

These checks describe expected behavior, not a newly completed manual test run. Automated validation above records the implementation revision. Production deployment, current CI and device acceptance must be verified separately when preparing a release.
