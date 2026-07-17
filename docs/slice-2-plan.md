# Slice 2 — Project Action Workflow

## Purpose

Slice 2 turns the phone-first prototype into a usable project workflow before durable deployment begins.

The central requirement is:

> Every active project should show what happens next, when it should be checked, and what happened to earlier actions.

This slice remains browser-local. Database storage, authentication, deployment, backups, and remote access belong to Slice 3.

## Product decisions

### Project action points are the focus

A project has a timeline of action points. Each action point contains:

- a concrete action
- one check-in date
- an automatic opened timestamp
- an automatic completed timestamp
- a free-form completion note

The project overview shows only the current open action. Expanding the project opens a full-screen detail with a lightweight timeline containing the current action and the two most recent completed actions. Full timeline detail is available for every project with recorded actions, even when fewer than three exist.

Action points are not deleted or edited after creation. Minor typos are acceptable.

### Completing an action requires a next outcome

Completing an action records a free-form note and then requires one of three outcomes:

1. Open the next dated action point.
2. Move the project to Waiting.
3. Complete the project.

This prevents active projects from silently losing their next action.

### Dates are deliberately simple

There is one check-in date rather than separate due-date and review-date concepts. Once that date is reached, the action remains visible in Review until it is completed or replaced.

### Completed projects become accomplishments

The Projects page contains active and paused projects only. Completed projects move to the Accomplishments space under All Spaces, where they keep their full action timeline and can be reopened.

### Standalone tasks are later work

Standalone tasks may eventually exist for actions that do not belong to projects, but they are not required for Slice 2. The existing task kind remains for compatibility and future evolution, but no dedicated task workflow is added here.

### Thoughts remain non-actionable by default

Thoughts are retained without status pressure, categories, or permanent deletion controls on the Thoughts page.

### Archives are recoverable

Archive removes an item from active views without permanently deleting it. Permanent deletion remains limited and deliberate.

## Implementation stages

### Stage 1 — Shared data foundation

**Status: complete.**

- One application-level `PersonalDataProvider`
- Shared state across routes
- Pure domain transitions separated from React
- Browser persistence behind a storage adapter
- Debounced writes and page-hide flushing
- Migration support for existing local-storage data
- Focused automated tests

### Stage 2 — Project action timelines

**Status: implemented; phone validation remains.**

- Migrate the old single `nextAction` into a timeline entry
- Require a concrete action and check-in date for new active projects
- Show the current action on the project overview card
- Open a full-screen project detail from the expand icon
- Show a compact dotted timeline before revealing full history
- Allow full timeline detail for any project with recorded actions
- Complete actions with a free-form note
- Continue with a next action, Waiting, or project completion
- Move completed projects into the Accomplishments space
- Surface reached dates, opened actions, and completed actions in Weekly Review

### Stage 3 — Item lifecycle and archive recovery

Goal: make non-destructive state changes deliberate and consistent.

- Standardize Waiting, Incubating, Archive, Restore, and permanent deletion behavior
- Remove remaining page-specific status rules
- Add an archive recovery view where needed
- Ensure unresolved Inbox items, paused projects, and accomplishments have clear destinations
- Preserve action timelines through every project status transition

Exit condition: no project or item can become orphaned or disappear unintentionally.

### Stage 4 — Phone validation and polish

Test this sequence on a phone:

1. Capture an item.
2. Clarify it as a project with its first action and check-in date.
3. Confirm the project card shows only the current action.
4. Open the full-screen project detail.
5. Expand full timeline detail even with only one or two actions.
6. Reach or simulate the check-in date and confirm Review surfaces it.
7. Complete the action with a free-form note.
8. Open the next action.
9. Repeat completion and move the project to Waiting.
10. Complete a final action and confirm the project appears in Accomplishments under All Spaces.
11. Reopen a completed project.
12. Confirm Weekly Review shows opened actions, completed actions, reached dates, completed projects, and recent thoughts.

Only polish friction revealed by this flow. Avoid unrelated visual redesign.

## Data-model direction

```text
Project
├── title, outcome, area, status
└── action timeline
    ├── current open action
    │   ├── title
    │   ├── check-in date
    │   └── opened timestamp
    └── completed actions
        ├── opened timestamp
        ├── completed timestamp
        └── free-form completion note
```

The browser-local model should remain straightforward to migrate into the Slice 3 database.

## Definition of done

Slice 2 is complete when:

- Capture-to-project works end to end.
- Active projects expose a dated action or visibly lack one.
- Action history is preserved and non-deletable.
- Completing an action always produces a deliberate next project state.
- Completed projects appear in the Accomplishments space.
- Status and lifecycle behavior is centralized and tested.
- Existing local data migrates safely.
- Weekly Review reflects reached dates, opened actions, completed actions, completed projects, and recent thoughts.
- Lint, tests, and production build pass.
- The full workflow is manually validated on a phone.

## Out of scope

- Standalone task workflow
- Database and server API
- Authentication
- HTTPS production deployment
- Cross-device synchronization
- Photo storage
- Backups and export
- Library, Trips, Fitness, Habits, integrations, AI, and notifications
- Full dock-pin customization
