# Product Specification

## Problem

Important responsibilities, projects, interests, and future plans currently live across memory and disconnected tools. This makes it harder to focus, creates repeated mental review, and allows useful ideas to compete with urgent work.

## Product goal

Create a single personal control centre that answers:

1. What matters now?
2. What requires a next action?
3. What can safely remain in the background?
4. What information can be captured automatically?

## Initial user

The first version is designed for one user. Multi-user collaboration is out of scope until the personal workflow is useful and stable.

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

## MVP workflows

### Capture

The user can quickly add an item with only a title. Classification and additional metadata are optional at capture time.

### Clarify

An inbox item can become a task, project, note, or archived reference.

### Plan

The user can assign an area, status, priority, dates, and next action.

### Focus

The Now view surfaces a limited set of relevant items instead of the complete database.

### Review

A weekly review identifies stale projects, unprocessed inbox items, waiting items, and upcoming deadlines.

## Non-goals for MVP

- Native iOS or Android applications
- Social features
- Complex team permissions
- Full calendar replacement
- Automatic travel booking
- Autonomous AI changes without confirmation
- Supporting every possible tracker type

## Later specialised modules

### Reading

Books, reading status, progress, dates, notes, and ratings.

### Fitness

Strava-imported activities, weekly frequency, distance, and trend summaries without manual activity entry.

### Travel

Trip ideas, possible dates, budget, transport and accommodation options, decision deadlines, and supported price alerts.

### AI assistance

Natural-language capture, classification suggestions, task breakdown, weekly summaries, and stale-project detection. Suggestions must remain reviewable.

## Success criteria

The product is successful when:

- New thoughts can be captured in seconds.
- Active priorities are visible without searching.
- Incubating projects remain documented without demanding attention.
- Weekly review takes less effort than mentally reconstructing all commitments.
- The app remains useful even when integrations are unavailable.
