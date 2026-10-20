# PCC design exploration — October 2026

**Status:** unselected concepts for review, 20 October 2026. Application behavior, current interface rules and roadmap priorities are unchanged.

[Original three-direction board](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=6-298) · [New Focus and Atlas board](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=15-800)

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
| Taste app-screen guidance | Information hierarchy, honest data, restrained framing and product-specific objects | Initial pass used guidance only; the follow-up below runs the generator. No separate Chrome inspector |
| Impeccable | Operate-mode restraint, hierarchy, contrast/target criteria and context-specific adaptation | Its source detector was used in the earlier audit; it does not certify a native Figma file |
| Anthropic frontend-design | Deliberate typography, differentiated composition and avoiding generic decoration | No ready-made page or template was copied |
| Emil design-engineering / mobile-native | Label clarity, interaction consistency, repeated-use restraint and phone considerations | Limited influence on static mockups; no motion implementation or physical-phone validation |

The device-specific Projects refinement particularly follows Impeccable's adaptation principle: rethink the experience for its context rather than scaling it.

For the original three directions, a rough self-assessment was that **about one third of the visual rationale was informed by skill guidance**, with the rest coming from PCC's product/source evidence, the user's brief and the agent's design synthesis. This is a low-confidence qualitative estimate, not a measured attribution. The skills had a stronger influence on workflow and quality checks than on the exact compositions. Reading installed guidance is not equivalent to running every script or completing every playbook.


## Further exploration: Focus and Atlas

The user found the original three too similar in composition. The next pass changes the working model and navigation emphasis, while retaining the same DM Sans body typeface across the pair so typography cannot do the work of differentiation.

[Focus and Atlas comparison board](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=15-800)

### D / Focus — one action as the working surface

A selected action occupies the main stage, with its project identity, optional check-in, details and direct action controls. A manual queue retains other work. Week reuses that action-first model and keeps fixed commitments nearby. Phone exposes one stage; desktop gives its supporting context a separate working area.

This tests a different question: “Which action am I working on, and what do I need to do it?” It does not automatically rank work, start a timer or add a new canonical Focus status.

[Projects phone](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-497) · [Projects desktop](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-646) · [Week phone](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-569) · [Week desktop](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-737)

The Projects Next action button switches between two native states on phone and desktop. Completion and editing controls remain illustrative. Tradeoff: broader project state receives less attention, so the project queue and return context must remain easy to retrieve.

### E / Atlas — outcomes and actions as visible branches

Each project outcome visibly owns its child actions. Desktop can compare several branches and keeps Waiting projects present. Phone follows one branch with its outcome and actions together. Week places the source projects beside a separate chosen-work area and fixed commitments.

This tests “What outcomes am I maintaining, and which independent actions belong to them?” Connecting lines express canonical ownership, never dependencies, a forced sequence or project progress. The aligned structure needs no canvas panning or zooming.

[Projects phone](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-846) · [Projects desktop](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-1035) · [Week phone](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-944) · [Week desktop](https://www.figma.com/design/rtPqrxzyCazl5XIIaorQ7Y?node-id=12-1168)

Tradeoff: the branch view may become large with many projects/actions. Search, collapsing branches and return position require a later runnable slice. Open-action, editing, calendar and weekly-selection controls remain visual proposals.

### More of the skills' process used

- **Taste:** ran app-style exploration and generated two complete direction sheets: true-black-flat, seed 2125060116, for Focus; achromatic-ledger, seed 823358440, for Atlas. Adopted their lightness/neutral-chrome disciplines. DM Sans was deliberately retained in both, minimum phone controls raised to 44px, and the generated greeting/KPI home pattern omitted because it does not answer PCC's action question.
- **Impeccable:** loaded product context, recorded seven grounded alternatives, ran concept exploration with a successful network retry, and evaluated its challengers. Reference seed:0fc5a9accc2c6b31 assigned grounded candidate 4. The open-table/branching approach and competitive dark-first direction became the two requested alternatives. The user's request was to produce two options for review; no final selection or preference was inferred.
- **Frontend Design:** wrote distinct questions, composition contracts, signature structures and explicit risks before construction. The new screens must differ in their main task and information arrangement even in grayscale.
- **Figma:** reused published button instances, created scoped semantic variables and shared text styles, built native editable hierarchy and added navigation/action-switching reactions. Screenshot review corrected date wrapping and strengthened ownership connections. A fresh reviewer prompted explicit phone project access, check-in labels, mixed-item terminology and visible Waiting project identity; those four issues were corrected.

This extension adds eight main screens plus two Focus action states, making 24 full-size frames across the file. All ten new full-size states and the comparison board were exported. Some later PNG captures and a transition preview incompletely rendered Focus context text even though the native layers and SVG retained it. The phone prototype was checked directly in the browser; a hard reload produced complete first/second-state evidence. Clicking Next action switched to the second state. The fresh reviewer scored all four requested fixes resolved and cleared the recapture gate from that settled browser evidence; this verdict covers the scored fixes in exploratory mockups. Starter connector limits were reached during export diagnosis, so hidden archived diagnostic context layers remain for later cleanup. The three projects, three open project actions, two active projects, one Waiting project and three weekly selections reconcile against one fictional dataset. Native bounds checks found no child overflow after corrections. Browser-only HTML/CSS lint and inspector tools were not run against Figma; that would not validate these layers. Accessibility and real-device behavior remain implementation checks.

These are alternatives to evaluate, not an approved replacement or a validated application. No live data, app code or product lifecycle rules changed.

## Review and implementation gate

The original screens were rendered and sizing/wrapping problems corrected. Starter-plan limits interrupted three final exports in the first pass; earlier renders remain for those. Both Projects frames were subsequently exported, visually inspected and structurally checked without child overflow.

This is not a usability study, accessibility certification, responsive implementation or complete component/state library. Next, choose a structure and visual direction, then build a small runnable Projects slice covering list/detail, action editing, optional date, Waiting, explicit project completion, loading/error/empty states, keyboard focus and return navigation. Preserve private accounts, canonical ownership and the narrow Capture-only offline promise.

All example content is fictional. No live screenshots, production records or private deployment addresses belong in this public repository.
