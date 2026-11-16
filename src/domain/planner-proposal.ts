import { applyPlannerSessionChanges, normalizePlannerSession, plannerSessionCanMove, sessionOverlaps, timeToMinutes, validatePlannerSession, type PlannerSession } from "./weekly-planner.ts";
import type { Item } from "./personal-data.ts";

export type ProposalChanges = { sessions: PlannerSession[]; removeSessionIds: string[] };
type CalendarEvent = { source: string; start: string; end: string; allDay: boolean };
export function plannerBusyEvents(events: CalendarEvent[]) {
  // Recognised PCC projections are already represented by canonical planner state.
  // Unknown events on the PCC calendar are commitments, not safe-to-ignore projections.
  return events.filter(event => ["google", "agenda", "pcc"].includes(event.source))
    .map(({start, end, allDay}) => ({start, end, allDay}));
}
function localDate(value: string, timezone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(date);
  const get = (key:string) => parts.find(part=>part.type===key)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
/** Keep only events whose half-open interval intersects the requested inclusive local-date range. */
export function plannerBusyEventsInLocalDateRange(events: CalendarEvent[], from: string, to: string, timezone: string) {
  return plannerBusyEvents(events).filter(event => {
    const startDate = event.allDay ? event.start.slice(0,10) : localDate(event.start, timezone);
    const endDate = event.allDay ? event.end.slice(0,10) : localDate(event.end, timezone);
    if (!startDate || !endDate || startDate > to) return false;
    if (event.allDay) return endDate > from;
    const end = new Date(event.end);
    const clock = new Intl.DateTimeFormat("en-GB", {timeZone:timezone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(end);
    return endDate > from || (endDate === from && clock !== "00:00");
  });
}
export function plannerCalendarCoverageIssue(coverageComplete: boolean) {
  return coverageComplete ? "" : "Calendar availability could not be fully verified.";
}
export function localPlannerClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (key: string) => parts.find(part => part.type === key)?.value ?? "";
  return { today: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}
export function validPlannerDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T12:00:00Z")) && new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
}
export function withinPlannerHorizon(date: string, today: string) {
  if (!validPlannerDate(date)) return false;
  const end = new Date(today + "T12:00:00Z"); end.setUTCDate(end.getUTCDate() + 21);
  return date >= today && date <= end.toISOString().slice(0, 10);
}
export function reviewPlannerChanges(existing: PlannerSession[], changes: ProposalChanges, items: Item[], replaceFrom: string, today: string, time: string): PlannerSession[] | string {
  const ids = new Set<string>();
  for (const id of changes.removeSessionIds) {
    if (ids.has(id)) return "Duplicate session change.";
    ids.add(id);
    const original = existing.find(session => session.id === id);
    if (!original || original.date < replaceFrom || !withinPlannerHorizon(original.date, today) || !plannerSessionCanMove(original, today, time)) return "A removed session is no longer movable.";
  }
  const retained = existing.filter(session => !ids.has(session.id));
  for (const session of changes.sessions) {
    if (ids.has(session.id) || !normalizePlannerSession(session) || session.date < replaceFrom || !withinPlannerHorizon(session.date, today)
      || [0, 6].includes(new Date(session.date + "T12:00:00Z").getUTCDay()) || !plannerSessionCanMove(session, today, time)) return "A proposed session is invalid or no longer movable.";
    ids.add(session.id);
    const original = existing.find(value => value.id === session.id);
    if (original && (original.date < replaceFrom || !withinPlannerHorizon(original.date, today) || !plannerSessionCanMove(original, today, time))) return "An existing session is no longer movable.";
  }
  const result = applyPlannerSessionChanges(retained, changes.sessions, today, time);
  if (!result) return "A proposed change conflicts with another session.";
  for (const session of changes.sessions) {
    const issue = validatePlannerSession(session, result.filter(other => other.id !== session.id), items);
    if (issue) return issue;
    if (result.some(other => other.id !== session.id && !other.outcome && sessionOverlaps(other, session))) return "Another scheduled session overlaps this block.";
    if (timeToMinutes(session.start) + session.minutes > 1440) return "A proposed session ends after midnight.";
  }
  return result;
}

function isoLocal(value: string, zone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Invalid calendar event timestamp.");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute");
}
type BusyEvent = { start: string; end: string; allDay: boolean };
export function conflictWithEvent(session: PlannerSession, event: BusyEvent, timezone: string) {
  const from = session.date + "T" + session.start;
  const finish = timeToMinutes(session.start) + session.minutes;
  const end = finish === 1440
    ? (() => { const d = new Date(session.date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) + "T00:00"; })()
    : session.date + "T" + String(Math.floor(finish/60)).padStart(2, "0") + ":" + String(finish%60).padStart(2, "0");
  const eventStart = event.allDay ? event.start.slice(0,10) + "T00:00" : isoLocal(event.start, timezone);
  const eventEnd = event.allDay ? event.end.slice(0,10) + "T00:00" : isoLocal(event.end, timezone);
  return from < eventEnd && eventStart < end;
}
