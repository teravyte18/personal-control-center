# Product Specification

## Problem

Important responsibilities, projects, interests, and future plans currently live across memory and disconnected tools. This makes it harder to focus, creates repeated mental review, and allows useful ideas to compete with urgent work.

## Product goal

Create a single personal control centre that answers:

1. What matters now?
2. What requires a next action?
3. What can safely remain in the background?
4. What changed during the week?
5. What information can eventually be captured automatically?

## Initial user

The first version is designed for one user. Multi-user collaboration is out of scope until the personal workflow is useful and stable.

## Product principles

- Capture first; organise later.
- Phone use is primary; desktop is a progressive enhancement.
- The application must remain useful without AI or external integrations.
- AI should be anticipated in the data model but should not block the first release.
- Reflection should be supported without turning every thought into a productivity task.
- The weekly review should reconstruct the week from recorded activity so the user does not need to remember every detail.
- Future modules should not crowd or destabilise primary navigation.

## MVP information architecture

### Capture

The root page is a quiet input-first space. Saving requires only text and immediately creates an Inbox item. Capture remains permanently accessible through the central navigation action.

### Inbox

Inbox contains unprocessed captures. Each item can be expanded, edited, given context, assigned an area, and classified as a project, task, thought, or note.

### Projects

Projects are finite outcomes requiring multiple actions. Work, Education, and Personal are filters or areas inside Projects rather than separate applications. Incubating is a project status and filter.

### Thoughts

Thoughts preserve ideas, observations, questions, and reflections that do not necessarily require a next action, deadline, or completion state.

### Review

Review contains two modes:

- **This week:** current status summary plus guided reflection
- **History:** completed reviews, locations, photos, and later longer-term patterns

## Navigation and spaces

The compact navigation model contains:

```text
Inbox | Projects | + Capture | Thoughts | Review
```

The four surrounding destinations are conceptually pinnable. Capture is permanent.

An All Spaces directory contains both core and specialised modules. Library, Trips, Fitness, Habits, Settings, and future modules appear there first and may later replace a pinned destination without redesigning the shell.

Desktop presents the same structure as a navigation rail.

## Core concepts

### Area

A long-lived responsibility or interest, initially Work, Education, Personal, or Uncategorised. Areas organise projects without becoming independent top-level apps.

### Item

A captured piece of information. Items share a common model and can specialise into tasks, projects, thoughts, notes, books, trips, habits, or automated records.

### Project

A finite outcome requiring multiple actions. Every active project should eventually have a clear next action or an explicit waiting state.

### Status

Initial statuses:

- Inbox
- Active
- In progress
- Waiting
- Incubating
- Completed
- Archived

### Weekly review

A recurring Saturday-morning ritual combining a factual status summary with guided reflection.

Before writing, the review should display:

- Items still open
- Items completed during the week
- Items started or changed during the week
- Unprocessed inbox items
- Waiting items
- Relevant upcoming deadlines

The review itself should support:

- Structured reflection prompts
- A longer open-writing section
- Location name
- Optional photo
- Draft saving
- Priorities or intentions for the next week
- Review history and place history

The application should encourage variation in review locations without making a new location mandatory.

## First usable release

The first release should prioritise a complete, testable loop over breadth:

1. Quiet quick capture
2. Inbox clarification
3. Projects grouped by area and status
4. Non-actionable Thoughts storage
5. Complete, reopen, incubate, archive, and delete core items
6. Weekly Review with automatically listed open and completed items
7. Review History
8. Browser-local persistence and migration
9. Phone dock, desktop rail, and All Spaces directory
10. Installable-PWA foundation

Authentication, hosted persistence, detailed next actions, specialised trackers, and external integrations follow after this loop is comfortable to use.

## Non-goals for the first usable release

- Native iOS or Android applications
- Social features
- Complex team permissions
- Full calendar replacement
- Automatic travel booking
- Autonomous AI changes
- Voice or video reviews
- Complete reading, fitness, and travel modules
- Full navigation pin customisation UI

## Later specialised modules

### Reading

Books, reading status, progress, dates, notes, ratings, and eventually recommendations grounded in the user's reading history.

### Fitness

Strava-imported activities, weekly frequency, distance, and trend summaries without manual activity entry.

### Travel

Trip ideas, possible dates, budget, transport and accommodation options, decision deadlines, and supported price alerts.

### AI assistance

Natural-language classification suggestions, task breakdown, weekly summaries, duplicate detection, and stale-project detection. Suggestions must remain optional, transparent, and reviewable.

### Rich review capture

Voice transcription and optional video journaling may be added after the written review habit is established.

## Success criteria

The product is successful when:

- New thoughts can be captured in seconds from a phone.
- Captured items can be clarified without friction.
- Active and incubating projects remain distinguishable.
- Thoughts can be preserved without being forced into tasks.
- The weekly review presents enough recorded context that the user does not need to reconstruct the entire week from memory.
- A review can be started, saved as a draft, completed, and found in history.
- New specialised spaces can be added without changing the core shell.
- The app remains useful when integrations and AI are unavailable.
