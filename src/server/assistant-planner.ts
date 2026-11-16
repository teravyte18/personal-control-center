import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/server/database";
import { getAgendaEvents, reconcileGoogleCalendar } from "@/server/google-calendar";
import { loadPersonalDataState } from "@/server/personal-data-store";
import {
  normalizePlannerSession,
  type PlannerSession,
} from "@/domain/weekly-planner";
import { createId } from "@/domain/personal-data";
import { conflictWithEvent, localPlannerClock, plannerAvailabilityUtcRange, plannerBusyEventsInLocalDateRange, plannerCalendarCoverageIssue, reviewPlannerChanges, withinPlannerHorizon, type ProposalChanges } from "@/domain/planner-proposal";
import { normalizePersonalDataSnapshot } from "@/domain/personal-data-snapshot";
import { attemptCalendarSync } from "@/domain/calendar-sync-result";

export class PlannerConflictError extends Error {}
export class PlannerInputError extends Error {}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export async function plannerAvailability(userId:string, from:string, to:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw new PlannerInputError("Invalid date range.");
  const span = (Date.parse(to+"T12:00:00Z")-Date.parse(from+"T12:00:00Z")) / 86400000;
  if (!Number.isFinite(span) || span > 21) throw new PlannerInputError("Date range must not exceed 21 days.");
  // Cover timezone offsets and DST at both boundaries; overlap filtering happens in the configured local zone.
  const range = plannerAvailabilityUtcRange(from,to);
  const calendar = await getAgendaEvents(userId,range.timeMin,range.timeMax);
  if (!calendar.connected || calendar.needsReconnect) throw new PlannerConflictError("Calendar is not available.");
  // Do not expose appointment titles, locations or notes to an agent.
  const state=await loadPersonalDataState(userId);
  const busy = plannerBusyEventsInLocalDateRange(calendar.events,from,to,state.snapshot.plannerPreferences.timezone);
  return {revision:state.revision,coverageComplete:calendar.coverageComplete,timezone:state.snapshot.plannerPreferences.timezone,
    preferences:state.snapshot.plannerPreferences, busy, sessions:state.snapshot.plannerSessions.filter(s=>s.date>=from&&s.date<=to),
    fetchedAt:new Date().toISOString()};
}

type ProposalStatus = "draft" | "approved" | "rejected" | "conflict";
type ProposalRow = {
  id: string; request_id: string | null; snapshot_revision: number | string;
  replace_from: Date | string; rationale: string; changes: unknown; status: ProposalStatus;
  conflict_reason: string; applied_revision: number | string | null; calendar_sync: unknown;
  created_at: Date | string; decided_at: Date | string | null;
};
function dateOnly(value: Date | string) { return value instanceof Date ? value.toISOString().slice(0,10) : String(value).slice(0,10); }
function stamp(value: Date | string | null) { return value === null ? null : new Date(value).toISOString(); }
function mapProposal(row: ProposalRow) {
  return { id: row.id, requestId: row.request_id, revision: Number(row.snapshot_revision),
    replaceFrom: dateOnly(row.replace_from), rationale: row.rationale, changes: row.changes as ProposalChanges,
    status: row.status, conflictReason: row.conflict_reason, appliedRevision: row.applied_revision === null ? null : Number(row.applied_revision),
    calendarSync: row.calendar_sync, createdAt: stamp(row.created_at), decidedAt: stamp(row.decided_at) };
}
function proposalInput(input: unknown, now: Date, today: string) {
  if (!record(input) || Object.keys(input).some(k => !["revision","replaceFrom","sessions","removeSessionIds","requestId","rationale"].includes(k))
    || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0
    || typeof input.replaceFrom !== "string" || !withinPlannerHorizon(input.replaceFrom, today)
    || typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.length > 4000
    || !Array.isArray(input.sessions) || input.sessions.length > 20
    || !Array.isArray(input.removeSessionIds) || input.removeSessionIds.length > 20
    || input.sessions.length + input.removeSessionIds.length < 1
    || (input.requestId !== undefined && (typeof input.requestId !== "string" || !/^[0-9a-f-]{36}$/.test(input.requestId)))) throw new PlannerInputError("Invalid proposed plan.");
  const removeSessionIds = input.removeSessionIds as unknown[];
  if (removeSessionIds.some(id => typeof id !== "string" || !id || id.length > 100)) throw new PlannerInputError("Invalid removal ID.");
  const sessions: PlannerSession[] = [];
  for (const candidate of input.sessions) {
    if (!record(candidate) || Object.keys(candidate).some(k => !["id","date","start","minutes","title","work","estimateMinutes","priorityReason"].includes(k))
      || typeof candidate.priorityReason !== "string" || !candidate.priorityReason.trim() || candidate.priorityReason.length > 1000
      || (candidate.id !== undefined && (typeof candidate.id !== "string" || !candidate.id || candidate.id.length > 100))) throw new PlannerInputError("Invalid proposed session.");
    const session = normalizePlannerSession({id: candidate.id ?? createId(), date: candidate.date, start: candidate.start,
      minutes: candidate.minutes, title: candidate.title, estimateMinutes: candidate.estimateMinutes ?? candidate.minutes,
      work: candidate.work, locked: false, origin: "assistant", createdAt: now.toISOString()});
    if (!session) throw new PlannerInputError("Invalid proposed session.");
    sessions.push(session);
  }
  return { revision: input.revision as number, replaceFrom: input.replaceFrom as string,
    rationale: (input.rationale as string).trim(), requestId: input.requestId as string | undefined,
    changes: {sessions: sessions.map((session, i) => ({...session, priorityReason: (input.sessions as Record<string, unknown>[])[i].priorityReason as string})), removeSessionIds: removeSessionIds as string[]} };
}
function canonicalChanges(value: unknown): ProposalChanges {
  if (!record(value) || !Array.isArray(value.sessions) || !Array.isArray(value.removeSessionIds)) throw new PlannerConflictError("Stored draft is invalid.");
  const sessions = value.sessions.map(candidate => normalizePlannerSession(candidate));
  if (sessions.some(session => !session)) throw new PlannerConflictError("Stored draft is invalid.");
  return {sessions: sessions as PlannerSession[], removeSessionIds: value.removeSessionIds as string[]};
}
export async function listPlannerProposals(userId: string) {
  const sql = getDatabase();
  const rows = await sql<ProposalRow[]>`select id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at
    from planner_proposals where user_id=${userId} order by created_at desc limit 30`;
  return rows.map(mapProposal);
}
export async function submitPlannerProposal(userId: string, input: unknown) {
  const current = await loadPersonalDataState(userId);
  const now = new Date();
  const clock = localPlannerClock(now, current.snapshot.plannerPreferences.timezone);
  const parsed = proposalInput(input, now, clock.today);
  const sql = getDatabase();
  // A lost MCP response must not create a second draft or acknowledge a request twice.
  if (parsed.requestId) {
    const [previous] = await sql<ProposalRow[]>`select id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at
      from planner_proposals where user_id=${userId} and request_id=${parsed.requestId}`;
    if (previous) return {draft: mapProposal(previous)};
  }
  if (current.revision !== parsed.revision) throw new PlannerConflictError("Plan changed; retrieve current context.");
  const changes = canonicalChanges(parsed.changes);
  const reviewed = reviewPlannerChanges(current.snapshot.plannerSessions, changes, current.snapshot.items, parsed.replaceFrom, clock.today, clock.time);
  if (typeof reviewed === "string") throw new PlannerInputError(reviewed);
  return sql.begin(async tx => {
    const [state] = await tx<{revision: number | string}[]>`select revision from personal_data_state where user_id=${userId} for update`;
    if (!state || Number(state.revision) !== parsed.revision) throw new PlannerConflictError("Plan changed; retrieve current context.");
    if (parsed.requestId) {
      const [queued] = await tx<{week_start: Date | string}[]>`select week_start from planner_requests where user_id=${userId} and id=${parsed.requestId} and processed_at is null for update`;
      if (!queued) {
        const [previous] = await tx<ProposalRow[]>`select id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at
          from planner_proposals where user_id=${userId} and request_id=${parsed.requestId}`;
        if (previous) return {draft: mapProposal(previous)};
        throw new PlannerConflictError("Planning request is no longer pending.");
      }
      const start = new Date(parsed.replaceFrom + "T12:00:00Z"); start.setUTCDate(start.getUTCDate() - (start.getUTCDay()+6)%7);
      if (dateOnly(queued.week_start) !== start.toISOString().slice(0,10)) throw new PlannerInputError("Request week does not match proposal.");
    }
    const [row] = await tx<ProposalRow[]>`insert into planner_proposals(id,user_id,request_id,snapshot_revision,replace_from,rationale,changes)
      values(${randomUUID()},${userId},${parsed.requestId ?? null},${parsed.revision},${parsed.replaceFrom},${parsed.rationale},${tx.json(parsed.changes)})
      returning id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at`;
    if (parsed.requestId) await tx`update planner_requests set processed_at=now() where user_id=${userId} and id=${parsed.requestId}`;
    return {draft: mapProposal(row)};
  });
}
export async function decidePlannerProposal(userId: string, id: unknown, decision: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id) || !["approve","reject"].includes(String(decision))) throw new PlannerInputError("Invalid draft decision.");
  const sql = getDatabase();
  const [initial] = await sql<ProposalRow[]>`select id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at
    from planner_proposals where user_id=${userId} and id=${id}`;
  if (!initial) throw new PlannerInputError("Draft not found.");
  if (initial.status !== "draft") return {proposal: mapProposal(initial)};
  if (decision === "reject") {
    const [row] = await sql<ProposalRow[]>`update planner_proposals set status='rejected',decided_at=now()
      where user_id=${userId} and id=${id} and status='draft'
      returning id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at`;
    return {proposal: mapProposal(row ?? initial)};
  }
  const current = await loadPersonalDataState(userId);
  const zone = current.snapshot.plannerPreferences.timezone;
  const clock = localPlannerClock(new Date(), zone);
  const changes = canonicalChanges(initial.changes);
  const to = changes.sessions.reduce((max, session) => session.date > max ? session.date : max, dateOnly(initial.replace_from));
  let issue = current.revision !== Number(initial.snapshot_revision) ? "Planner revision changed." : "";
  let availability: Awaited<ReturnType<typeof plannerAvailability>> | undefined;
  if (!issue) {
    const result = reviewPlannerChanges(current.snapshot.plannerSessions, changes, current.snapshot.items, dateOnly(initial.replace_from), clock.today, clock.time);
    if (typeof result === "string") issue = result;
  }
  if (!issue) {
    try { availability = await plannerAvailability(userId, dateOnly(initial.replace_from), to); }
    catch { issue = "Calendar availability could not be verified."; }
  }
  if (!issue && availability && availability.revision !== Number(initial.snapshot_revision)) issue = "Planner revision changed.";
  if (!issue && availability) issue = plannerCalendarCoverageIssue(availability.coverageComplete);
  if (!issue && availability && changes.sessions.some(session => availability.busy.some(event => conflictWithEvent(session,event,zone)))) issue = "A live Calendar commitment overlaps this draft.";
  const outcome = await sql.begin(async tx => {
    const [proposal] = await tx<ProposalRow[]>`select id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at
      from planner_proposals where user_id=${userId} and id=${id} for update`;
    if (!proposal || proposal.status !== "draft") return {row: proposal, snapshot: null};
    const [state] = await tx<{revision: number | string; snapshot: unknown}[]>`select revision,snapshot from personal_data_state where user_id=${userId} for update`;
    const snapshot = state ? normalizePersonalDataSnapshot(state.snapshot) : null;
    const liveClock = snapshot ? localPlannerClock(new Date(), snapshot.plannerPreferences.timezone) : clock;
    let conflict = issue || (!state || Number(state.revision) !== Number(proposal.snapshot_revision) ? "Planner revision changed." : "");
    if (liveClock.today !== clock.today || liveClock.time < clock.time) conflict = "Approval time changed; review again.";
    const next = !conflict && snapshot ? reviewPlannerChanges(snapshot.plannerSessions, changes, snapshot.items, dateOnly(proposal.replace_from), liveClock.today, liveClock.time) : null;
    if (typeof next === "string") conflict = next;
    if (conflict || !snapshot || !Array.isArray(next)) {
      const [row] = await tx<ProposalRow[]>`update planner_proposals set status='conflict', conflict_reason=${conflict || "Draft could not be applied."}, decided_at=now()
        where user_id=${userId} and id=${id} returning id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at`;
      return {row, snapshot: null};
    }
    const updated = {...snapshot, plannerSessions: next};
    const [saved] = await tx<{revision: number | string}[]>`update personal_data_state set snapshot=${tx.json(updated)}, revision=revision+1, updated_at=now()
      where user_id=${userId} returning revision`;
    const [row] = await tx<ProposalRow[]>`update planner_proposals set status='approved',applied_revision=${Number(saved.revision)},decided_at=now()
      where user_id=${userId} and id=${id} returning id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at`;
    return {row, snapshot: updated};
  });
  if (!outcome.row) throw new PlannerInputError("Draft not found.");
  if (!outcome.snapshot) return {proposal: mapProposal(outcome.row)};
  const calendarSync = await attemptCalendarSync(() => reconcileGoogleCalendar(userId, outcome.snapshot!));
  const [synced] = await sql<ProposalRow[]>`update planner_proposals set calendar_sync=${sql.json(calendarSync)}
    where user_id=${userId} and id=${id} returning id,request_id,snapshot_revision,replace_from,rationale,changes,status,conflict_reason,applied_revision,calendar_sync,created_at,decided_at`;
  return {proposal: mapProposal(synced)};
}
