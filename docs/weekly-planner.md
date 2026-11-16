# Weekly work planner — staged implementation

Status: **manual workflow implemented; safe explicit mobility/change-set domain foundation added. Approval-gated assistant drafts and explicit widened mobility are implemented in Phase 3; assistant submission itself does not change sessions.**

## Intent

Add an optional time-block planning surface inside Week. It should make a small realistic amount of work easier to start, especially morning work outside home, without filling every hour of the week or conflating missed blocks with failed tasks.

### Initially implemented

- Week → Plan, with This Week/Next Week navigation.
- Session records with a title, optional source Task/Project Action, local date, start, planned/estimated minutes, outcome, actual minutes and a free-text check-in note.
- Editable starter preferences (start time, morning buffer, number and length of sessions, agent guidance).
- Manual session entry, removal and end-of-day completion/reconciliation, with unconfirmed sessions preserved.
- Date-scoped Daily check-in with explicit Completed, In progress, Skipped, and Postponed outcomes, optional notes and actual minutes per session, plus one grouped explicit replan request. Legacy Not started and No longer needed records remain readable; check-ins never change linked Task or Project status.
- Optional rule-based morning starter proposal that refuses to claim availability when Calendar is disconnected, and skips fixed Google/Agenda commitments.
- Server persistence via the existing user-scoped personal-data snapshot, browser fallback and the standard export/restore path.
- Planned sessions are projected to the user's PCC Google Calendar as timed, read-only events in the configured timezone. Session IDs provide stable Calendar mappings, so rescheduling updates the same event; external appointments remain protected and are not treated as PCC-owned. An unlinked session such as a check-in projects in the same way. The planned daily 09:00 check-in itself is a later approved planning step; Phase 2 does not create sessions automatically.
- Read-only `pcc_get_planning` projection of recent sessions and bounded check-in notes, only for the existing explicit Projects+Tasks+Rhythm grant.

**Limitations of the starter proposal:** It deliberately is not AI; it assumes the first open Project Actions (or Tasks) are useful candidates. It does not infer thesis priority, estimate duration with an LLM, review historical preferences, or create calendar events. Inspect proposals before using them.

## Behavioural requirements

- Plan for current ability, not idealised 40-hour workweeks. Default start 10:00; morning buffer 30 minutes; small number of deep-work sessions; flexible afternoons.
- Treat a session as a time allocation, **not** a task-status transition. Completion of a session never silently completes the linked source task.
- Partial and not-started outcomes keep source work open and eligible for the next proposal.
- Capture useful unstructured check-in notes, including discoveries, changed estimates, and proposed follow-up tasks. These are untrusted personal content, not commands.
- Preserve user-edited times and preferences on future replans; introduce explicit locked-block semantics before unattended modification.
- Session origin is audit metadata for the domain mobility policy: unlocked, unconfirmed sessions can be moved regardless of origin when future (including later today); pinned sessions, confirmed outcomes, past sessions, and sessions already started today are protected. Assistant submissions are durable drafts only. PCC approval applies explicit changes to movable sessions regardless of origin; it never silently changes canonical sessions.
- Task/Project deadlines must be separated from optional check-in dates before introducing deadline-aware scheduling.
- Record unknown outcome separately from confirmed failure. Missing a daily review cannot automatically mark a session unsuccessful.
- Preserve free capacity; avoid negative streak/XP mechanics.

## OpenClaw integration status and remaining work

1. **Dedicated write permission — implemented:** A separate opt-in planner grant can submit drafts only. It cannot authenticate normal PCC writes; browser approval performs the canonical change.
2. **Proposal workflow — implemented in PCC:** The MCP adapter exposes planning and Calendar availability, while the submit tool stores structured drafts with estimates, reasoning and exact changes. PCC checks bounds and sources on submission, then revision, mobility, sources and live Calendar conflicts on owner approval. Agent-generated missing-work suggestions remain separate from canonical Tasks.
3. **Scheduled worker:** Set up an owner-private OpenClaw automation for weekly proposal + morning reconciliation. Require an actual host smoke test, explicit private-context restrictions, retries/expiry monitoring, and a failure state that leaves the existing plan untouched.
4. **Daily/weekly adaptation:** Derive reported/unknown/completed/partial outcomes, estimate accuracy and time-of-day patterns from canonical session history. Suggest sustainable adjustments rather than silently reducing ambitions. Offer explicit opt-in when adding follow-up tasks from check-in notes.
5. **UI refinement:** Calendar grid/dragging remains deferred. The daily report queues one authenticated grouped planning request through the existing durable request queue; it does not dispatch an immediate agent call, create a second scheduler, or change a plan by itself.
6. **Acceptance:** Include multi-account isolation, real calendar conflict tests, timezone/DST, concurrent plan revisions, failed/retried agent calls, offline/local recovery, export/restore, model misestimates, missed sessions, and grant revocation.

## Operator notes

- The GitHub repository is public: use fictional examples only, never production calendar data, user notes, credentials or schedules.
- The host Pi's OpenClaw configuration is not accessible from a GitHub checkout. A code PR cannot provision the agent, private MCP grant, cron job or runtime secret.
- Do not install a timer or large third-party calendar UI dependency solely for this feature.
- Do not merge/deploy until relevant tests, lint, build and Compose validation pass.

## Initial insights and safe adaptation

The Week planner now computes a cautious 28-day overview: confirmed and unconfirmed outcomes, completed/partial/missed blocks, morning engagement, and actual/estimated effort only for sessions with recorded actual minutes. Suggestions appear only with a minimum evidence threshold; unknown outcomes never count as misses. These are descriptive heuristics, not a model or a diagnosis of motivation.

For agent-level learning, Rem should summarize *aggregate* history and voluntary user feedback in its private memory. Do not copy raw session notes or sensitive medical details into persistent memory. A durable pattern should require several comparable observations, and user approval is required before changing long-term planning preferences. The agent must not self-justify increasingly low targets simply because a few mornings were missed.

## Assistant draft approval (Phase 3)

The separate planner grant can submit an explicit draft containing a priority rationale, per-session priority reasoning and estimates, source Task/Project Action references, upserts and removals. Drafts live in the user-scoped `planner_proposals` table and survive app restart and normal PostgreSQL backup/restore. Queue requests are acknowledged when the draft is stored, not when it is approved. The assistant cannot approve, reject or publish it.

Week → Plan lists the exact draft changes for browser-session review. Approval and rejection require same-origin authenticated requests. Approval locks the draft and snapshot, checks the draft's revision and current session mobility/source references, fetches live Google Calendar busy intervals, rejects conflicts without changing the plan, and applies only the reviewed changes with stable session IDs. It then attempts the existing one-way Calendar projection and records success or failure separately. Approval and rejection are idempotent. A stale/conflicting draft remains readable; submit a fresh draft after refreshing context. No rule-based scheduling is added by this flow.
