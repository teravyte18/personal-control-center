# Weekly Rhythm

## Status

**Selected next product slice. Product design is defined here before implementation.**

Weekly Rhythm is a flexible weekly planning layer. It is not a habit tracker, a streak system, or a replacement for Tasks, Projects, Weekly Review, or Google Calendar.

Its job is to answer:

> What do I want to make room for this week, what is fixed, and what is still floating?

## Product problem

The existing system handles two things well:

- concrete work through Tasks and Project Actions;
- hard dates through dated records and Calendar projection.

Normal use exposed a gap between them.

Flexible work often receives an arbitrary date simply so it remains visible. When it is not done on that date, it is rescheduled. Repeating that process can hide the item until the next chosen date and turn the end of the week into a parking place for unfinished work.

Recurring personal intentions have the opposite problem: they may matter every week without belonging to a fixed day.

Weekly Rhythm should provide structure without requiring a rigid daily schedule.

## Core principles

- **Week before day.** The default planning unit is the week.
- **No streaks.** Missing Tuesday does not create a failure if the weekly intention is still achievable.
- **Hard dates remain hard.** Calendar events and genuinely date-bound work are not converted into flexible intentions.
- **Do not duplicate canonical work.** Tasks and Project Actions remain Tasks and Project Actions.
- **Flexible intent stays visible.** Something chosen for this week should not disappear merely because one proposed day passed.
- **Completion matters more than perfect scheduling.**
- **Sparse use is valid.** A week may contain only one or two intentions.
- **No guilt mechanics.** Unfinished weekly items become review/planning signals, not punishment.

## Weekly view model

The page should combine four kinds of information.

### 1. Fixed commitments

Read-only commitments that constrain the week, primarily Calendar events and other genuinely time-specific records.

Examples:

- an appointment;
- a meeting;
- a travel departure.

The first implementation does not need to recreate a full calendar grid. A compact upcoming list or day grouping is enough.

Calendar coverage may be incomplete. If PCC is not reading every relevant calendar source, availability language must remain cautious.

### 2. Dated work

Existing Tasks and Project Actions with meaningful check-in/target dates.

These remain owned by their original domains and link back to the normal editor.

Weekly Rhythm should surface them in the week but must not create a second editable copy.

### 3. Weekly focus

A one-off way to keep an existing Task or Project Action visible for the current week **without inventing a specific date**.

This directly addresses repeated arbitrary rescheduling.

A Weekly Focus reference contains only planning metadata:

- week;
- source type;
- source record ID;
- optional Project Action ID where relevant.

The source Task/Project remains canonical.

Completing the source automatically satisfies/removes the weekly focus reference.

At the end of the week an unfinished focus can be:

- carry forward to the next week;
- leave active but no longer weekly-focused;
- explicitly park/remove from focus.

The product should not silently roll everything forever.

### 4. Rhythm intentions

Recurring or flexible goals expressed as a target count across a week.

Examples:

- run 3 times;
- read twice;
- cook 2 meals;
- do 4 focused work sessions.

A Rhythm intention does not need an exact day.

Each intention may contain:

- title;
- target count for the week;
- optional area/category;
- optional preferred daypart;
- optional approximate session duration;
- optional short note;
- active / paused state.

The first version should avoid complex recurrence rules. Active rhythm intentions simply apply to each new week until paused or edited.

## Completion model

Rhythm progress is event-based.

Each completion records:

- intention ID;
- completion timestamp;
- optional note.

Progress is the number of completions inside the current week.

Deleting a mistaken completion should be possible.

Do not store only a mutable counter; completion events preserve useful history for Weekly Review and future context.

## Week boundaries

Use **Saturday-to-Friday**, matching the established Weekly Review rhythm.

This creates one coherent transition:

1. Saturday Review reflects on the period that just ended;
2. the next Saturday-to-Friday Rhythm period becomes the active planning horizon;
3. unfinished Weekly Focus items can be consciously carried, parked, or released during that transition;
4. Rhythm progress and Review context share the same period boundaries.

This is more useful than adopting Monday-to-Sunday simply because it is conventional. Existing Monday-based helper logic for other views can remain where appropriate; Weekly Rhythm should have explicit tested helpers for its own Saturday-to-Friday period.

Do not infer week boundaries from locale defaults. Keep the rule deterministic and covered by tests.

## Proposed persistence model

Weekly Rhythm should be stored in the normal user-scoped Personal Data snapshot so it inherits current persistence, export, backup, and account isolation.

Conceptually:

```ts
type RhythmTemplate = {
  id: string;
  title: string;
  targetPerWeek: number;
  area?: string;
  preferredDaypart?: "morning" | "afternoon" | "evening";
  approximateMinutes?: number;
  note?: string;
  state: "active" | "paused";
  createdAt: string;
  updatedAt: string;
};

type RhythmCompletion = {
  id: string;
  templateId: string;
  completedAt: string;
  note?: string;
};

type WeeklyFocus = {
  id: string;
  weekStart: string;
  sourceType: "task" | "project-action";
  sourceItemId: string;
  sourceActionId?: string;
  createdAt: string;
};
```

The exact storage names may change during implementation, but the separation between reusable rhythm templates, completion events, and references to existing work should remain.

## Main screen

The useful screen is a **This Week** view, not a generic routines database.

Suggested order:

1. brief week heading and remaining days;
2. fixed/upcoming commitments;
3. dated Tasks and Project Actions;
4. Weekly Focus;
5. Rhythm intentions with progress;
6. quiet end-of-week carry-forward decisions where needed.

Example:

```text
THIS WEEK

Fixed
Mon 15:00  Meeting
Thu 11:30  Appointment

Dated
Thu         Submit form
Fri         Project action

Focus
○ Compare two options
○ Finish setup step

Rhythm
Running        ■■□  2 / 3
Deep work      ■■■□ 3 / 4
Reading        ■□   1 / 2
```

No score, XP, streak flame, or “failed day” is required. The filled progress itself provides enough light gamification.

## Interaction rules

### Add a rhythm

Minimum required fields:

- title;
- target per week.

Everything else is optional.

Useful quick targets: 1, 2, 3, 4, 5, 7.

### Mark completion

One tap should add a completion for now.

A secondary interaction may allow another completion date or note.

### Add existing work to this week

Tasks and Project Actions should eventually offer **Add to this week**.

That action creates a Weekly Focus reference rather than changing the item's actual date.

### Repeated postponement

PCC should deterministically identify records that have been rescheduled repeatedly if the existing history makes that possible.

Weekly Rhythm or Weekly Review may surface a quiet prompt such as:

> This item has been moved several times. Keep it in this week's focus, park it, or give it a real date?

This is a planning aid, not an Advisor call.

## Home and Agenda integration

Weekly Rhythm should become the main cross-space weekly horizon.

After the core page works:

- Home can show a compact **This week** section;
- Agenda can be simplified, repurposed, or removed if Rhythm plus Google Calendar provides its useful value;
- Calendar remains the specialist tool for detailed calendar browsing;
- PCC should show only the commitments needed to understand workload/availability.

Do not redesign Agenda independently before testing Weekly Rhythm.

## Weekly Review integration

Weekly Review is the natural reflection partner.

Generated Review context may later include:

- Rhythm targets and completions;
- unfinished Weekly Focus items;
- repeatedly carried-forward focus items;
- significant dated work completed during the period.

This should help reflection without auto-writing conclusions.

A missed weekly target is data, not a negative judgement.

## Personal Context Layer integration

Weekly Rhythm should become a new explicit Personal Context domain only after its canonical model exists.

Useful context should include:

- active rhythm intentions;
- current-week target/progress;
- recent completion history in a bounded window;
- current Weekly Focus references resolved to their Task/Project labels.

That context can support deterministic Home/Review views before any LLM consumes it.

## Advisor value

Weekly Rhythm plus Weekly Review creates a useful longitudinal pair:

- Rhythm records **intention**;
- Review records **reflection**;
- Tasks/Projects record concrete commitments and outcomes.

A future Advisor could compare those sources when explicitly asked, for example identifying recurring gaps between planned and actual weeks.

The model should not infer moral conclusions from missed targets or sparse data.

## MVP scope

The first implementation should include:

- active/paused rhythm intentions;
- target-per-week;
- one-tap completion and undo/delete;
- Saturday-to-Friday current-week progress;
- Weekly Focus references for existing Tasks and Project Actions;
- current-week dated Tasks/Project Actions;
- a compact fixed-commitments area if reliable Calendar input is already available;
- phone-first This Week screen;
- persistence/export/backup compatibility;
- tests for week boundaries, progress, carry-forward behaviour, and source-record deletion/completion.

## Explicit exclusions from MVP

- streaks;
- XP/levels/rewards;
- rigid daily schedules;
- arbitrary cron-style recurrence;
- automatic schedule generation;
- LLM-generated plans;
- automatic carry-forward without user choice;
- meal planning;
- workout logging;
- detailed time blocking;
- replacing Google Calendar;
- notification spam for every unfinished rhythm;
- retrospective editing of large completion histories.

## Validation questions after shipping

Weekly Rhythm is successful if normal use answers “yes” to several of these:

- Does flexible work get fewer fake Friday dates?
- Are important undated items easier to remember during the week?
- Do recurring intentions stay visible without feeling restrictive?
- Is the progress display motivating without creating guilt?
- Does Weekly Review become easier because intention/progress context already exists?
- Does Agenda become less necessary?
- Does Home become more useful with a small weekly horizon?
