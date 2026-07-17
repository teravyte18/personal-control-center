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

Archive removes a project from active views without deleting it. Archived projects appear under All Spaces, preserve their complete action history and metadata, and restore to the state they had before archiving. Permanent deletion is intentionally deferred to later data-management work.

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

**Status: complete.**

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

**Status: complete.**

- Waiting projects use a distinct yellow state without landing-page warnings
- Archive is a deliberate action from expanded project detail
- Archived projects disappear from Projects and Accomplishments
- Archive is available under All Spaces
- Restore returns a project to its exact previous status
- Action timelines, dates, notes, and completion metadata survive archive and restore
- Lifecycle behavior is centralized and covered by automated tests

### Stage 4 — Phone validation and polish

**Status: complete.**

Validated on phone:

1. Capture an item.
2. Clarify it as a project with its first action and check-in date.
3. Confirm the project card shows only the current action.
4. Open the full-screen project detail.
5. Expand full timeline detail even with only one or two actions.
6. Reach or simulate the check-in date and confirm attention states.
7. Complete the action with a free-form note.
8. Open the next action.
9. Move the project to Waiting.
10. Complete a final action and confirm the project appears in Accomplishments.
11. Reopen a completed project.
12. Confirm Weekly Review context.
13. Archive a project, open Archive from All Spaces, restore it, and confirm it returns to its prior state with history intact.

Only polish friction revealed by this flow. Avoid unrelated visual redesign.

## Data-model direction

```text
Project
├── title, outcome, area, status
├── optional archive metadata
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

Slice 2 is complete because:

- Capture-to-project works end to end.
- Active projects expose a dated action or visibly lack one.
- Action history is preserved and non-deletable.
- Completing an action always produces a deliberate next project state.
- Completed projects appear in the Accomplishments space.
- Archive and restore are recoverable and preserve prior state.
- Status and lifecycle behavior is centralized and tested.
- Existing local data migrates safely.
- Weekly Review reflects reached dates, opened actions, completed actions, completed projects, and recent thoughts.
- Lint, tests, and production build pass.
- The complete workflow is manually validated on a phone.

## Out of scope

- Standalone task workflow
- Permanent deletion UI
- Database and server API
- Authentication
- HTTPS production deployment
- Cross-device synchronization
- Photo storage
- Backups and export
- Library, Trips, Fitness, Habits, integrations, AI, and notifications
- Full dock-pin customization
