# UI/UX Refresh 2026

This document records the selected interface consolidation work after the application grew from a small planner into a broader personal control center.

The goal is **not** to replace the visual identity. Themes, typography, the themed Capture control, and the phone-first character remain. The refresh should reduce unnecessary chrome, improve hierarchy, and make navigation scale as more spaces exist.

## Audit summary

The current interface is coherent and usable, but three patterns no longer scale well:

1. desktop navigation renders every available space in a permanent narrow rail, which now requires scrolling;
2. Home treats Capture and attention as separate surfaces instead of one coherent near-term view;
3. many unrelated objects use the same strong rounded-card treatment, which weakens hierarchy and consumes excessive vertical space on phone.

The strongest existing screens are Library, Expenses, Markets, Keychain, and Food. They should inherit shared polish but should not be structurally redesigned without a concrete need.

## Principles

- Keep the existing identity rather than adopting a generic SaaS aesthetic.
- Phone usability remains the primary constraint.
- Use theme accent for identity/selection and semantic colours for meaning.
- Reserve strong danger colour for actual danger/overdue state.
- Prefer plain rows and light grouping over a bordered card for every record.
- Permanent explanatory copy must justify its space.
- Content density should follow the amount and importance of information.
- Specialist tools should remain specialist tools: PCC should surface useful context rather than rebuild Google Calendar or TradingView.
- Each refresh slice must remain independently reviewable and testable.

## Slice A — Navigation and shell

### Desktop

Replace the scrolling all-destinations rail with a bounded configurable pinned rail.

Requirements:

- no scrollbar in primary navigation;
- Capture remains permanently available;
- Spaces remains permanently available;
- show a limited set of user-selected working destinations;
- desktop pins are independent from phone quick-access preferences;
- All Spaces remains the complete launcher.

### Phone dock

Keep the four configurable destinations around Capture, but reduce the dock's visual and physical dominance.

Requirements:

- preserve comfortable touch targets;
- reduce height/padding where possible;
- ensure page content is never obscured by the fixed dock;
- keep Capture visually distinctive;
- make Spaces access understandable without depending on a hidden gesture.

### Spaces

Spaces becomes more important after desktop navigation is reduced.

Requirements:

- group destinations by purpose rather than one flat inventory;
- use a denser two-column launcher on phone;
- distinguish secondary/system destinations from everyday working spaces;
- keep future spaces visibly separate without giving them equal prominence.

## Slice B — Home and Today

Home should answer two questions:

1. what do I need to remember?
2. what deserves attention now?

Capture remains primary, but overdue/due work should become one coherent Today surface rather than multiple generic warning banners.

Requirements:

- show concrete overdue/due records rather than only counts;
- combine Tasks and Project Actions into a common near-term presentation while preserving ownership links;
- keep uncertain/undated work out of Today;
- retain Inbox visibility;
- use a two-column Capture + Today composition on wide desktop and a stacked flow on phone;
- avoid guilt/streak language.

Calendar context may later appear here, but Home should not blindly mirror every Google Calendar event.

## Calendar / Agenda direction

Agenda is **not selected for visual polish yet**.

Google Calendar remains the specialist calendar. PCC should consume calendar context where useful rather than attempting to replace the full Google Calendar experience.

Likely follow-up direction:

- allow selected calendars to contribute upcoming events to PCC;
- support source visibility controls so low-action calendars such as sports/holidays can stay out of Home/Today;
- optionally retain a compact Upcoming view if a combined Task / Project Action / Calendar horizon proves useful;
- remove or simplify the dedicated Agenda space if Home/Upcoming provides the useful value.

Do not spend significant UI work on the existing Agenda screen until this product decision is resolved.

## Slice C — Density and visual hierarchy

After Navigation and Home settle, reduce unnecessary card chrome across the operational pages.

Priorities:

- Projects: neutral project/action surfaces with semantic accents instead of whole-card status fills;
- Tasks: compact list rows; editing should not explode the list vertically;
- Thoughts: reduce padding and card height;
- Review: give important sections stronger hierarchy and collapse/de-emphasise empty sections;
- shared page headers, spacing, widths, list rows, forms, and empty-state conventions;
- remove explanatory text that simply restates visible UI.

Library, Expenses, Markets, Food, and Keychain should receive only shared-system cleanup unless later usage shows a product-level problem.

## Copy rule

Permanent text must do at least one of the following:

- identify the content;
- explain something genuinely ambiguous;
- communicate a real limitation;
- tell the user what action is available or required.

If the interface already makes the meaning obvious, remove the sentence.

## Review checkpoints

The refresh should be delivered as stacked, independently reviewable PRs:

1. documentation and frozen scope;
2. Navigation & Shell;
3. Home / Today;
4. Density & Visual System.

After Navigation & Shell and again after Home / Today, review desktop and phone screenshots before broadening the visual-system pass.
