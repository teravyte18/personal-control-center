import { createId, type Item } from "./personal-data.ts";

/** A session is not a task. One work session can reference multiple existing actions. */
export type PlannerWorkRef = { sourceType: "task" | "project-action"; sourceItemId: string; sourceActionId?: string };
export type PlannerOutcome = "completed" | "partial" | "not-started" | "cancelled";
export type PlannerSession = {
  id: string;
  date: string;
  start: string; // HH:mm, local wall time, not an ISO UTC instant
  minutes: number;
  title: string;
  work: PlannerWorkRef[];
  estimateMinutes: number;
  locked: boolean;
  origin?: "manual" | "assistant";
  createdAt: string;
  outcome?: PlannerOutcome;
  outcomeAt?: string;
  note?: string;
  actualMinutes?: number;
};

/** Assistant's current public submit remains assistant-origin-only until approval-gated drafts ship. */
export function plannerSessionInReplacementWindow(
  session: PlannerSession, from: string, to: string, today: string,
) {
  return session.origin === "assistant" && plannerSessionCanMove(session, today, "23:59")
    && session.date > today && session.date >= from && session.date <= to;
}

/** Origin is audit metadata, not an editability boundary. Sessions already started today are immovable. */
export function plannerSessionCanMove(session: PlannerSession, today: string, currentTime: string) {
  return !session.locked && !session.outcome
    && (session.date > today || (session.date === today && timeToMinutes(session.start) > timeToMinutes(currentTime)));
}

/** Safely apply an explicit change set without deleting or replacing unmentioned sessions. */
export function applyPlannerSessionChanges(
  existing: PlannerSession[], changes: PlannerSession[], today: string, currentTime: string,
): PlannerSession[] | null {
  const ids = new Set<string>();
  const replacements = new Map<string, PlannerSession>();
  const additions: PlannerSession[] = [];
  for (const change of changes) {
    const normalized = normalizePlannerSession(change);
    if (!normalized || ids.has(normalized.id) || !plannerSessionCanMove(normalized, today, currentTime)) return null;
    ids.add(normalized.id);
    const original = existing.find(session => session.id === normalized.id);
    if (original) {
      if (!plannerSessionCanMove(original, today, currentTime)) return null;
      // Keep identity and audit metadata canonical; a move cannot rewrite origin or creation time.
      replacements.set(normalized.id, { ...normalized, id: original.id, origin: original.origin, createdAt: original.createdAt, locked: original.locked });
    } else {
      additions.push(normalized);
    }
  }
  const result = [...existing.map(session => replacements.get(session.id) ?? session), ...additions];
  const changedIds = new Set([...replacements.keys(), ...additions.map(session => session.id)]);
  for (const session of result.filter(item => changedIds.has(item.id))) {
    if (result.some(other => other.id !== session.id && !other.outcome && sessionOverlaps(session, other))) return null;
  }
  return result;
}
export type PlannerPreferences = {
  timezone: string;
  start: string;
  end: string;
  morningBufferMinutes: number;
  capacityPercent: number;
  targetThesisSessions: number;
  thesisSessionMinutes: number;
  notes: string;
};
export const defaultPlannerPreferences: PlannerPreferences = {
  timezone: "Europe/Lisbon",
  start: "10:00",
  end: "17:00",
  morningBufferMinutes: 30,
  capacityPercent: 65,
  targetThesisSessions: 3,
  thesisSessionMinutes: 120,
  notes: "Prioritise morning deep work and leave flexible afternoons. Keep unfinished work in consideration.",
};
export type PlannerState = { preferences: PlannerPreferences; sessions: PlannerSession[] };
export const emptyPlannerState: PlannerState = { preferences: defaultPlannerPreferences, sessions: [] };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const validDate = (v: unknown): v is string => typeof v === "string" && datePattern.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z")) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;
const validTime = (v: unknown): v is string => typeof v === "string" && timePattern.test(v);
export const timeToMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const validTimestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
function minutesInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}
export function normalizePlannerPreferences(value: unknown): PlannerPreferences {
  if (!isRecord(value)) return { ...defaultPlannerPreferences };
  const start = validTime(value.start) ? value.start : defaultPlannerPreferences.start;
  const end = validTime(value.end) && timeToMinutes(value.end) > timeToMinutes(start) + 30 ? value.end : defaultPlannerPreferences.end;
  return {
    timezone: typeof value.timezone === "string" && value.timezone.length <= 100 && (() => { try { new Intl.DateTimeFormat("en", {timeZone:value.timezone as string}); return true; } catch { return false; } })() ? value.timezone : defaultPlannerPreferences.timezone,
    start, end: timeToMinutes(end) > timeToMinutes(start) ? end : "23:30",
    morningBufferMinutes: minutesInRange(value.morningBufferMinutes, 0, 120) ? value.morningBufferMinutes : 30,
    capacityPercent: minutesInRange(value.capacityPercent, 20, 100) ? value.capacityPercent : 65,
    targetThesisSessions: minutesInRange(value.targetThesisSessions, 0, 7) ? value.targetThesisSessions : 3,
    thesisSessionMinutes: minutesInRange(value.thesisSessionMinutes, 30, 240) ? value.thesisSessionMinutes : 120,
    notes: typeof value.notes === "string" ? value.notes.slice(0, 2000) : defaultPlannerPreferences.notes,
  };
}
export function normalizePlannerSession(value: unknown): PlannerSession | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || !validDate(value.date)
    || !validTime(value.start) || !minutesInRange(value.minutes, 15, 480) || value.minutes % 15 !== 0
    || timeToMinutes(value.start) + value.minutes > 1440
    || typeof value.title !== "string" || !value.title.trim() || value.title.length > 300
    || !validTimestamp(value.createdAt) || typeof value.locked !== "boolean"
    || !Array.isArray(value.work) || value.work.length > 10
    || !minutesInRange(value.estimateMinutes, 15, 1440)) return null;
  const work: PlannerWorkRef[] = [];
  for (const ref of value.work) {
    if (!isRecord(ref) || !["task","project-action"].includes(String(ref.sourceType)) || typeof ref.sourceItemId !== "string" || !ref.sourceItemId
      || (ref.sourceType === "project-action" && (typeof ref.sourceActionId !== "string" || !ref.sourceActionId))
      || (ref.sourceActionId !== undefined && typeof ref.sourceActionId !== "string")) return null;
    work.push({sourceType:ref.sourceType as PlannerWorkRef["sourceType"],sourceItemId:ref.sourceItemId,sourceActionId:typeof ref.sourceActionId === "string" ? ref.sourceActionId : undefined});
  }
  const outcome = ["completed","partial","not-started","cancelled"].includes(String(value.outcome)) ? value.outcome as PlannerOutcome : undefined;
  if (value.outcome !== undefined && !outcome) return null;
  if (outcome && !validTimestamp(value.outcomeAt)) return null;
  if (value.actualMinutes !== undefined && !minutesInRange(value.actualMinutes, 0, 1440)) return null;
  if (value.note !== undefined && (typeof value.note !== "string" || value.note.length > 4000)) return null;
  if (value.origin !== undefined && !["manual","assistant"].includes(String(value.origin))) return null;
  return {
    id:value.id,date:value.date,start:value.start,minutes:value.minutes,title:value.title.trim(),work,origin: value.origin as PlannerSession["origin"] | undefined,
    estimateMinutes:value.estimateMinutes,locked:value.locked,createdAt:value.createdAt,
    outcome,outcomeAt:outcome ? value.outcomeAt as string : undefined,
    actualMinutes:value.actualMinutes as number | undefined,
    note:typeof value.note === "string" ? value.note : undefined,
  };
}
export function normalizePlannerSessions(value: unknown): PlannerSession[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 2000).flatMap((v): PlannerSession[] => {
    const session = normalizePlannerSession(v);
    if (!session || seen.has(session.id)) return [];
    seen.add(session.id);
    return [session];
  });
}
export function normalizePlannerState(value: unknown): PlannerState {
  if (!isRecord(value)) return {preferences:{...defaultPlannerPreferences},sessions:[]};
  return {preferences:normalizePlannerPreferences(value.preferences),sessions:normalizePlannerSessions(value.sessions)};
}
export function sessionOverlaps(a: Pick<PlannerSession,"date"|"start"|"minutes">, b: Pick<PlannerSession,"date"|"start"|"minutes">) {
  const aStart = timeToMinutes(a.start), bStart = timeToMinutes(b.start);
  return a.date === b.date && aStart < bStart + b.minutes && bStart < aStart + a.minutes;
}
export function validatePlannerSession(session: PlannerSession, existing: PlannerSession[], items: Item[], commitments: Array<{start:string;end:string;allDay:boolean}> = []): string | null {
  if (!normalizePlannerSession(session)) return "Invalid session fields.";
  for (const ref of session.work) {
    const item = items.find(i => i.id === ref.sourceItemId);
    if (!item || ["completed","archived"].includes(item.status)
      || (ref.sourceType === "task" && item.kind !== "task")
      || (ref.sourceType === "project-action" && (item.kind !== "project" || !item.actions.some(a => a.id === ref.sourceActionId && !a.completedAt)))) return "This session refers to work that is no longer open.";
  }
  if (existing.some(s => s.id !== session.id && !s.outcome && sessionOverlaps(s,session))) return "Another scheduled session overlaps this block.";
  const start = new Date(session.date+"T"+session.start+":00").getTime();
  const end = start + session.minutes*60000;
  if (commitments.some(c => {
    if (c.allDay) return c.start.slice(0,10) === session.date;
    const a = Date.parse(c.start), b = Date.parse(c.end);
    return Number.isFinite(a) && Number.isFinite(b) && start < b && a < end;
  })) return "A fixed calendar commitment overlaps this block.";
  return null;
}
export function createPlannerSession(input: Pick<PlannerSession,"date"|"start"|"minutes"|"title"|"work">, now = new Date()): PlannerSession {
  return {...input,id:createId(),estimateMinutes:input.minutes,locked:false,createdAt:now.toISOString()};
}
export function reconcileSession(session: PlannerSession, outcome: PlannerOutcome, note: string, actualMinutes?: number, now = new Date()): PlannerSession {
  return {...session,outcome,outcomeAt:now.toISOString(),note:note.slice(0,4000),actualMinutes};
}
export function plannerWeekDays(weekStart: string) {
  const saturday = new Date(weekStart+"T12:00:00Z");
  if (!validDate(weekStart) || saturday.getUTCDay() !== 6) return [];
  return Array.from({length:5},(_,i) => {const d=new Date(saturday);d.setUTCDate(d.getUTCDate()+i+2);return d.toISOString().slice(0,10);});
}
