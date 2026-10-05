# Real-Use Audit — October 2026

## Purpose

This document records product signals from normal use after the main module-building and UI-consolidation phases.

The goal is not to rank spaces by raw visit count. Some domains are naturally high-frequency while others are valuable only when a relevant event occurs. The useful question is whether each space removes friction, produces durable context, or deserves product changes.

The repository is public, so this audit records product-level patterns rather than private personal details.

## Strongly validated workflows

### Expenses

Expenses is the highest-frequency operational space because new purchases create an immediate reason to enter data.

The fast-entry workflow is working. Insights are already useful and should become materially more valuable as the history grows.

Product implication:

- keep entry friction extremely low;
- preserve longitudinal history;
- improve Insights only when more accumulated data reveals a clear need;
- do not add reconciliation chores that make the space harder to maintain.

### Weekly Review

Weekly Review remains a meaningful recurring workflow even when an occasional week is missed.

The reflective fields, period structure, location, and optional photo give the review enough identity to remain worth doing rather than feeling like a generic status report.

Product implication:

- Review history is one of PCC's richest longitudinal context sources;
- missing an occasional review should not create guilt or recovery work;
- future cross-space features should be able to use Review conclusions and patterns;
- Review should remain reflective rather than turning into another task dashboard.

### Notes

Notes has displaced the need for a separate general-purpose notes app in normal use.

Product implication:

- treat Notes as a validated stable feature;
- avoid redesigning it without concrete friction;
- preserve fast retrieval/editing and Markdown;
- cross-space integrations may consume selected Notes, but Notes should not become obligations automatically.

### Tasks and Projects

Tasks and Projects are useful and are doing their core job, but normal use has revealed a planning problem.

Items given a date are often rescheduled to a later date, frequently toward the end of the week. Repeated postponement can hide work until the next chosen date rather than keeping it visible as something that still matters.

This is not purely a user-behaviour problem. The product currently offers a specific date as one of the strongest ways to keep work visible, even when the work is flexible rather than truly date-bound.

Product implication:

- distinguish **hard/meaningful dates** from **this-week intent**;
- surface upcoming and repeatedly deferred work before it disappears for another week;
- avoid solving the problem with harsher overdue colours, streaks, or guilt language;
- improve Task editing when concrete friction is observed;
- improve Projects incrementally rather than redesigning a workflow that is already functional.

## Healthy lower-frequency workflows

### Library / Media

Library usage is event-driven: records are added or updated when something is started, finished, wishlisted, or worth reflecting on.

Lower visit frequency is therefore expected and is not evidence of a weak feature.

A new need has emerged around comics. Treating comics as ordinary books loses useful progress information for ongoing runs, while treating them as Series is semantically awkward.

Product implication:

- extend the Books model with an optional **Comic / sequential** mode rather than creating another top-level space;
- a comic record should be able to track a current issue and, later if useful, a lightweight set/range of issues read;
- ownership medium should be separate from content type: Physical, Digital, Both, or Unspecified;
- do not require issue-by-issue catalogue completeness.

### Food

Food is currently a lightweight recipe memory rather than an everyday planning tool.

That is acceptable. A saved entry should be useful even when it is only a concise preparation note rather than a polished cookbook recipe.

Product implication:

- do not require exhaustive recipes;
- allow usage to accumulate naturally;
- revisit freezer/menu/meal-planning ideas only after repeated cooking use creates evidence for them.

### Thoughts

Thoughts is useful for occasional low-friction observations and ideas.

Product implication:

- preserve the lightweight capture role;
- do not pressure Thoughts into Tasks or Projects automatically;
- they may be useful as optional reflection/context inputs later.

## Low-frequency / opportunistic workflows

### Inbox / generic Home capture

The generic Capture → Inbox → organise-later workflow has seen little normal use.

Direct creation into Tasks, Thoughts, or Notes is usually more natural when the intended destination is already obvious.

Product implication:

- keep Inbox as an emergency/ambiguous fast-capture path;
- stop treating Inbox as the required centre of the product workflow;
- future documentation should describe PCC as **direct spaces + shared planning/review**, with Inbox as a fallback rather than a mandatory funnel.

### Agenda

A full PCC calendar is not currently justified. A specialist calendar application already handles calendar browsing better.

PCC's value is in understanding enough calendar context to combine commitments with Tasks, Project Actions, and Weekly Rhythm.

Some external calendars may be missing from PCC's current view. This is acceptable while those calendars contain little important data, but future Advisor/planning features must not confidently claim a time is free when calendar coverage is known to be incomplete.

Product implication:

- do not invest in a full calendar replacement;
- Weekly Rhythm may absorb most of Agenda's useful product role;
- keep a compact upcoming-events view only if it materially helps cross-space planning;
- represent calendar-source coverage/limitations explicitly before AI uses availability reasoning.

### Markets

Markets is currently useful as an occasional watchlist rather than a core daily workflow.

Possible future value includes multiple time horizons and portfolio tracking, but portfolio state creates manual maintenance whenever holdings change.

Product implication:

- do not prioritise portfolio features until there is evidence the user wants PCC to be the primary investment view;
- lightweight interval controls are lower-maintenance and may be a better first enhancement.

### Keychain

Keychain is useful infrastructure but adoption is naturally gradual because there is no need to migrate every credential at once.

Product implication:

- keep the space stable and trustworthy;
- allow organic adoption as credentials are changed or needed;
- never use low visit frequency as a reason to weaken its security boundary;
- Keychain remains permanently excluded from Personal Context and AI.

## Product direction from the audit

The audit strengthens the current integration-first roadmap.

The highest-value next problem is not another standalone module. It is the gap between:

- work that has a real date;
- work that should remain visible this week but can happen flexibly;
- recurring intentions that should happen a few times per week without fixed scheduling;
- reflection on what actually happened.

Weekly Rhythm should address that gap while reusing Tasks, Projects, Calendar context, and Weekly Review rather than duplicating them.

The intended progression is:

1. Personal Context Layer and Context Inspector;
2. real-use audit;
3. Weekly Rhythm;
4. Home / Agenda integration around the weekly horizon;
5. only then experimental Advisor / LLM work.

See [`weekly-rhythm.md`](weekly-rhythm.md).
