# Slice 2 — Actionable Items Plan

## Purpose

Slice 2 turns the existing interface prototype into a complete personal planning workflow.

The central requirement is simple:

> Anything captured should have a deliberate destination, and anything that requires action should be easy to find again.

This slice remains browser-local. Durable database storage, authentication, deployment, backups, and remote access belong to Slice 3.

## Product decisions

### Tasks do not become another permanent navigation destination

The five-position phone dock remains unchanged.

Projects becomes the working area for both projects and actionable tasks. The exact presentation can use internal tabs or filters, but standalone tasks must be reachable without opening All Spaces or creating another dock item.

### Projects and tasks remain distinct

- A project is a finite outcome requiring more than one action.
- A task is one actionable step.
- A task may be standalone or linked to a project.
- An active or in-progress project should have a next action.
- Waiting or incubating projects may intentionally have no current next action.

### Thoughts remain non-actionable by default

Thoughts are retained without status pressure, categories, or permanent deletion controls on the Thoughts page. A thought may later be converted through an explicit action, but it should not silently become work.

### Archives are recoverable

Archive removes an item from active views without permanently deleting it. Permanent deletion should be limited and deliberate, primarily during inbox clarification or from an archive-management flow.

## Implementation stages

### Stage 1 — Shared data foundation

Goal: establish one reliable state and domain layer before expanding the model.

- Add an application-level `PersonalDataProvider`.
- Replace per-route `usePersonalData()` state instances with a shared context hook.
- Extract item types and pure transitions from React code.
- Move browser persistence behind a small storage adapter.
- Debounce local writes and flush safely when the page is hidden or closed.
- Keep migration support for existing local-storage data.
- Add Vitest and focused tests for:
  - status changes
  - complete and reopen behavior
  - migration and normalization
  - current-week calculations
  - archive and restore behavior

Exit condition: all current routes use the provider, existing behavior remains intact, and checks pass.

### Stage 2 — Project next actions

Goal: make projects operational rather than descriptive.

- Extend the project model with an explicit next action.
- Make title, outcome/description, area, status, and next action clearly editable.
- Show a visible warning or empty state when an active project has no next action.
- Do not require next actions for waiting, incubating, completed, or archived projects.
- Include project next actions in weekly review context.

Exit condition: every active project can clearly answer “what happens next?”

### Stage 3 — Tasks and project relationships

Goal: make classified tasks usable after leaving the inbox.

- Extend the task model with an optional project relationship.
- Add a phone-friendly Tasks view within Projects rather than a new dock destination.
- Show standalone tasks and project-linked tasks clearly.
- Allow a task to be linked, unlinked, completed, reopened, deferred, archived, and edited.
- Show linked tasks from the relevant project.
- Ensure Inbox classification routes tasks into the actionable view.

Exit condition: a captured task can be found, acted on, completed, and reviewed.

### Stage 4 — Item lifecycle and review context

Goal: make every non-destructive state transition deliberate and consistent.

- Standardize edit, defer, wait, incubate, archive, restore, and delete behavior.
- Ensure all transitions use shared domain actions.
- Add archive recovery where needed.
- Improve weekly review sections for:
  - open standalone tasks
  - project next actions
  - completed work this week
  - waiting items
  - incubating items
  - unresolved inbox items
  - thoughts created this week

Exit condition: there are no orphaned item types or page-specific status rules.

### Stage 5 — Phone validation and polish

Goal: validate the complete workflow on the primary device.

Test this sequence on a phone:

1. Capture an item.
2. Clarify it as a project.
3. Add a next action.
4. Capture and classify a standalone task.
5. Link a task to a project.
6. Complete and reopen tasks and projects.
7. Move items through waiting, incubating, archive, and restore.
8. Confirm the weekly review reflects the relevant changes.

Only polish friction found during this flow. Avoid unrelated visual redesign.

## Data-model direction

The implementation may evolve, but the conceptual relationships are:

```text
Item
├── Project
│   ├── outcome / description
│   ├── next action
│   └── linked tasks
├── Task
│   └── optional project ID
├── Thought
└── Note
```

This browser-local model should remain straightforward to migrate into the durable Slice 3 database.

## Definition of done

Slice 2 is complete when:

- Capture-to-action works end to end.
- Standalone and project-linked tasks have a clear home.
- Active projects expose a next action or visibly lack one.
- Status and lifecycle behavior is centralized and tested.
- Existing local data migrates safely.
- Weekly review reflects tasks, next actions, completed work, thoughts, and unresolved items.
- Lint, tests, and production build pass.
- The full workflow is manually validated on a phone.

## Out of scope

- Database and server API
- Authentication
- HTTPS production deployment
- Cross-device synchronization
- Photo storage
- Backups and export
- Library, Trips, Fitness, Habits, integrations, AI, and notifications
- Full dock-pin customization
