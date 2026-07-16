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
- The application must remain useful without AI or external integrations.
- AI should be anticipated in the data model but should not block the first release.
- Reflection should be supported without turning every thought into a productivity task.
- The weekly review should reconstruct the week from recorded activity so the user does not need to remember every detail.

## Core concepts

### Area

A long-lived responsibility or interest, such as Thesis, Work, Driving Licence, Reading, Fitness, Travel, or Personal Projects.

### Item

A captured piece of information. Items share a small common model and can later specialise into tasks, projects, notes, books, trips, habits, or automated records.

### Project

A finite outcome requiring multiple actions. Every active project should have a clear next action or an explicit waiting state.

### Status

Initial statuses:

- Inbox
- Active
- In progress
- Waiting
- Incubating
- Completed
- Archived

### Now view

A deliberately constrained view containing:

- Current priorities
- Due or overdue actions
- Active projects without a next action
- Waiting items requiring follow-up
- Recent activity and newly captured inbox items

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

## MVP workflows

### Capture

The user can quickly add an item with only a title. Classification and additional metadata are optional at capture time.

### Clarify

An inbox item can become a task, project, note, book, trip, or archived reference. The first release may implement only the core item types while preserving room for later specialisation.

### Plan

The user can assign an area, status, priority, dates, and next action.

### Focus

The Now view surfaces a limited set of relevant items instead of the complete database.

### Review

The user can open a weekly review, inspect a generated summary of the current situation and recent changes, record a guided reflection, attach a location and optional photo, and choose the next week's focus.

## First usable release

The first release should prioritise a complete, testable loop over breadth:

1. Quick capture
2. Inbox and basic item statuses
3. Mark items complete or reopen them
4. Current-situation summary
5. Weekly review with automatically listed open and completed items
6. Local persistence
7. Responsive web interface

Authentication, hosted persistence, specialised trackers, and external integrations may follow after this loop is comfortable to use.

## Non-goals for the first usable release

- Native iOS or Android applications
- Social features
- Complex team permissions
- Full calendar replacement
- Automatic travel booking
- Autonomous AI changes
- Voice or video reviews
- Complete reading, fitness, and travel modules

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

- New thoughts can be captured in seconds.
- Active priorities are visible without searching.
- Incubating projects remain documented without demanding attention.
- The weekly review presents enough recorded context that the user does not need to reconstruct the entire week from memory.
- A review can be started, saved as a draft, and resumed safely.
- The app remains useful when integrations and AI are unavailable.
