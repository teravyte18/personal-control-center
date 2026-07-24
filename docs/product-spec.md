# Personal System Specification

## Problem

Important responsibilities, projects, interests, and future plans can live across memory and disconnected tools. This creates repeated mental review, makes it harder to focus, and allows useful ideas to compete with urgent work.

## System goal

Create one personal control centre that answers:

1. What matters now?
2. What requires a next action?
3. What can safely remain in the background?
4. What changed during the week?
5. What information can eventually be captured automatically?

## Scope

This is a private personal system, not a commercial or collaborative product. One deployment may host a small invite-only set of independent accounts, but each account has completely separate data. Shared workspaces, teams, social features, monetisation, and growth-oriented requirements are out of scope.

The repository is public, so code, documentation, fixtures, examples, issues, and commit messages must not contain private or identifying personal information.

## System principles

- Capture first; organise later.
- Remain useful without AI or external integrations.
- Show what matters now instead of everything stored.
- Keep projects, one-off tasks, thoughts, and recurring routines conceptually distinct.
- Support reflection without turning every thought into an obligation.
- Reconstruct the review period from recorded activity so the user does not need to remember every detail.
- Save long-form input without generating one server write per character.
- Design phone interactions first and progressively enhance desktop use.
- Keep AI suggestions optional, transparent, and reviewable.

## Current page map

### Capture

A quiet landing page centred on one input. It also shows a compact Inbox count plus due or overdue attention that requires action now.

### Inbox

The processing space for new captures. An item can be expanded, edited, assigned a type and area, and then moved into its appropriate workflow.

Continuously edited title and context fields update immediately in the browser and persist after a short idle delay or on blur. Classification, area, dates, and the final Organise action remain discrete saves.

### Projects

Finite outcomes that require more than one action. Work, Education, Personal, and Uncategorised are areas within Projects; Active, In progress, Waiting, and Incubating describe lifecycle state rather than separate applications.

An active project should have one current action or an explicit Waiting state. Completed actions retain their dates and completion notes.

### Tasks

Concrete one-off actions that do not justify a project timeline. A task has:

- a title;
- optional notes;
- an area;
- an optional check-in date.

An undated task stays open indefinitely without an age-based warning. Recurring responsibilities belong to a future Routines space rather than Tasks.

### Thoughts

Observations, ideas, and notes retained without being forced into task or completion workflows.

Thought cards:

- are read-only by default;
- show their creation date;
- use an explicit Edit action;
- avoid area/category labels in the card presentation;
- do not expose deletion as a routine Thoughts-page action.

### Review

One top-level section with Current and History views.

The current review is tied to a fixed Saturday-to-Friday period and combines generated context with structured reflection, location, an optional photo, and next-week focus.

### All Spaces

A directory containing:

- all implemented primary spaces;
- Accomplishments and Archive;
- Account & access;
- the expandable mobile quick-access configuration;
- future Library, Trips, Fitness, Habits/Routines, and Settings destinations.

## Navigation model

### Compact screens

```text
configurable | configurable | Capture | configurable | configurable
```

- Capture is permanent in the centre.
- Four other slots are chosen from Inbox, Projects, Tasks, Thoughts, and Review.
- The default slots are Inbox, Projects, Tasks, and Review.
- Configuration is stored per browser/device.
- All Spaces remains visible outside the configurable dock.

### Larger screens

The desktop rail shows all available primary destinations rather than only the four mobile pins. Capture and All Spaces remain permanent.

## Core concepts

### Area

A long-lived responsibility or interest, such as Work, Education, Home, Health, Travel, or Personal Projects.

### Item

A captured record with a shared lifecycle. Items can specialise into projects, tasks, thoughts, notes, and later modules while preserving common identity, status, area, and timestamps.

### Project

A finite outcome requiring multiple actions. Projects preserve their action timeline and completion notes.

### Task

A one-off action that does not need an action timeline. Tasks may be dated or undated and disappear from the active Tasks view after completion.

### Status

Current lifecycle statuses are:

- Inbox;
- Active;
- In progress;
- Waiting;
- Incubating;
- Completed;
- Archived.

When an item is reopened or restored, the system should return it to its meaningful previous status where possible instead of always defaulting to Active.

### Weekly Review

A recurring reflection workflow with an enforced period:

- each Saturday opens the immediately preceding Saturday-to-Friday period;
- an unfinished draft remains tied to that period through Friday;
- completion closes the form until the following Saturday;
- a new Saturday replaces an unfinished older draft.

Before writing, the review displays:

- projects needing a current action, date, or check-in response;
- project actions opened during the period;
- project actions completed during the period;
- projects completed during the period;
- all currently open tasks relevant to the reviewed period;
- tasks completed during the period;
- thoughts added during the period.

The review form supports:

- what happened;
- what went well;
- what felt difficult;
- what was learned or noticed;
- what deserves attention next week;
- location name;
- optional durable photo;
- automatic draft persistence;
- completed review history with explicit period dates.

From Sunday through Friday after 08:00 local time, an unfinished review produces an in-app reminder. A browser/PWA notification is attempted when permission and platform execution permit it; delivery while fully closed remains best-effort and is tracked in issue #21.

## Primary workflows

### Capture

Add an item in seconds with only a title. Classification and additional metadata can wait.

### Clarify

Expand an Inbox item, improve its title/context, choose its kind and area, and organise it into a project, task, thought/note, or another supported lifecycle.

### Plan projects

Assign the project area and status, define one current action with a check-in date, then preserve the outcome when that action is completed.

### Manage one-off tasks

Create a task directly or from Inbox, optionally assign a date, reschedule freely, and complete it without introducing project ceremony.

### Reflect

Open the current Weekly Review, inspect generated context, write the reflection, attach location/photo information, and complete the fixed period.

### Recover

Reopen completed projects, restore archived projects to their previous status, migrate earlier browser data once, and restore deployment data from validated backups when needed.

## Delivered baseline

The usable system now includes:

1. quiet quick capture;
2. Inbox clarification;
3. actionable Projects with preserved action history;
4. standalone Tasks;
5. non-actionable Thoughts;
6. completion, Waiting, Accomplishments, Archive, and Restore;
7. scheduled Weekly Review and history;
8. configurable phone quick access and expanded desktop navigation;
9. invite-only authentication and isolated multi-device persistence;
10. durable review photos;
11. installable PWA assets and public HTTPS ingress;
12. validated local and encrypted off-site backups.

## Current non-goals

- native iOS or Android applications;
- social or collaboration features;
- public registration;
- shared projects or shared spaces;
- full calendar replacement;
- automatic travel booking;
- autonomous AI changes;
- generic task-reminder or notification-centre behavior;
- complete reading, fitness, travel, or routine modules;
- voice or video reviews before the written workflow proves it is needed.

## Later specialised modules

### Routines

Recurring responsibilities and practices that should not be recreated as one-off Tasks.

### Library

Books, reading status, progress, dates, notes, ratings, and eventually recommendations grounded in reading history.

### Fitness

Imported activities, weekly frequency, distance, and trend summaries without requiring manual activity entry.

### Trips

Trip ideas, possible dates, budget, transport and accommodation options, decision deadlines, and supported price monitoring.

### AI assistance

Natural-language classification suggestions, task breakdown, weekly summaries, duplicate detection, and stale-project detection. Suggestions must remain optional and require user confirmation before changing stored structure.

### Rich review capture

Voice transcription and optional video journaling may be considered after the written review habit is established.

## Success criteria

The system is useful when:

- new items can be captured in seconds from a phone;
- Inbox clarification is visible without cluttering Capture;
- active projects always expose their current action or Waiting state;
- one-off actions can remain lightweight Tasks;
- non-actionable thoughts remain documented without demanding attention;
- typing in long-form fields remains responsive while persistence happens safely;
- the Weekly Review provides enough recorded context that the user does not reconstruct the whole week from memory;
- an unfinished review can be resumed safely and a completed period cannot be accidentally rewritten;
- phone and desktop share canonical data while remaining isolated from other accounts;
- navigation can grow without redesigning the application shell;
- the system remains useful when integrations, notifications, and AI are unavailable;
- production data can be restored from validated local and off-site backups.
