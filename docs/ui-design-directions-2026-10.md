# PCC design exploration — October 2026

**Status:** unselected concepts for review, 20 October 2026. Application behavior, current interface rules and roadmap priorities are unchanged.

[Editable Figma comparison board](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=6-298)

## Three visual avenues

- **Daybook:** readable commitments and chosen work, Lora headings, DM Sans working text and a restrained forest palette.
- **Workbench:** a day strip, aligned actions, IBM Plex Sans and persistent desktop navigation.
- **Personal rooms:** Manrope, a distinct Today surface and a darker Music atmosphere within a shared interaction language.

There are 12 full-size editable frames: Week and Music at 390 × 844 and 1440 × 1024 for each direction. The comparison board includes six scaled editable phone previews. Native text, auto-layout, shapes, local variables/styles and imported Simple Design System controls remain editable. Week/Music navigation connects each pair. Other controls illustrate proposed UI; they do not mutate records.

No visual direction has been selected. Use the same fictional records and tasks to compare structure, hierarchy and reading comfort before choosing typography, palette or theme scope.

## Different interfaces for phone and desktop

Phone-first does not require the desktop interface to be an enlarged phone screen. Both can expose the same canonical objects through different arrangements.

Keep object names, project/action identity, lifecycle rules, optional dates, saved edits, status meanings, visual foundations and feedback consistent. Adapt navigation placement, information density, simultaneous context and editing presentation to the device. Essential capabilities must remain reachable on phone; progressive disclosure is not feature removal.

### Projects study

[Phone project view](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=8-419) · [Desktop project workspace](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=8-505)

Two additional full-size editable frames use Workbench styling to isolate the structural question. This is not a selection of direction B.

| Phone: perform an action | Desktop: understand and organise |
| --- | --- |
| Focus on one project and its open actions | Keep the project collection beside the selected project |
| Give Details and History separate views | Show actions, details and history together |
| Provide explicit Open and Add action controls | Place action controls beside visible project context |
| Keep project options available without crowding the action list | Expose project options and explicit project completion |
| Return to the same project and collection position | Switch projects while retaining useful workspace context |

The fictional project demonstrates multiple independent open actions, one undated action and one dated action. Completing an action must not implicitly complete its project. A project without open actions retains the existing Waiting semantics.

These two frames illustrate the proposed arrangements. The tabs, action opening, editing, completion and collection switching are not wired prototypes. A later slice should demonstrate the same end-to-end task on both devices, including return navigation and saved state.

## How the installed skills influenced the work

The audit's [provenance table](ui-ux-audit-2026-10.md#method-and-coverage) records the earlier source/browser review. For the Figma exploration:

| Input | Actual contribution | Limit |
| --- | --- | --- |
| Figma use / generate-design / foundations guidance | Editable hierarchy, library discovery, imported controls, token bindings, text styles, font loading and screenshot review | Bespoke assembly code and layout decisions were written for PCC |
| Taste app-screen guidance | Information hierarchy, honest data, restrained framing and product-specific objects | The direction-dealing generator and separate Chrome inspector were not run |
| Impeccable | Operate-mode restraint, hierarchy, contrast/target criteria and context-specific adaptation | Its source detector was used in the earlier audit; it does not certify a native Figma file |
| Anthropic frontend-design | Deliberate typography, differentiated composition and avoiding generic decoration | No ready-made page or template was copied |
| Emil design-engineering / mobile-native | Label clarity, interaction consistency, repeated-use restraint and phone considerations | Limited influence on static mockups; no motion implementation or physical-phone validation |

The device-specific Projects refinement particularly follows Impeccable's adaptation principle: rethink the experience for its context rather than scaling it.

A rough self-assessment is that **about one third of the visual rationale was informed by skill guidance**, with the rest coming from PCC's product/source evidence, the user's brief and the agent's design synthesis. This is a low-confidence qualitative estimate, not a measured attribution. The skills had a stronger influence on workflow and quality checks than on the exact compositions. Reading installed guidance is not equivalent to running every script or completing every playbook.

## Review and implementation gate

The original screens were rendered and sizing/wrapping problems corrected. Starter-plan limits interrupted three final exports in the first pass; earlier renders remain for those. Both Projects frames were subsequently exported, visually inspected and structurally checked without child overflow.

This is not a usability study, accessibility certification, responsive implementation or complete component/state library. Next, choose a structure and visual direction, then build a small runnable Projects slice covering list/detail, action editing, optional date, Waiting, explicit project completion, loading/error/empty states, keyboard focus and return navigation. Preserve private accounts, canonical ownership and the narrow Capture-only offline promise.

All example content is fictional. No live screenshots, production records or private deployment addresses belong in this public repository.
