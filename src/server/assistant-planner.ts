import "server-only";
import { getDatabase } from "@/server/database";
import { getAgendaEvents } from "@/server/google-calendar";
import { loadPersonalDataState } from "@/server/personal-data-store";
import {
  normalizePlannerSession, plannerSessionInReplacementWindow, timeToMinutes, validatePlannerSession,
  type PlannerSession,
} from "@/domain/weekly-planner";
import { createId } from "@/domain/personal-data";
import { normalizePersonalDataSnapshot } from "@/domain/personal-data-snapshot";

export class PlannerConflictError extends Error {}
export class PlannerInputError extends Error {}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isoLocal(value: string, zone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new PlannerInputError("Invalid calendar event timestamp.");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute");
}
type BusyEvent = { start: string; end: string; allDay: boolean };
function conflictWithEvent(session: PlannerSession, event: BusyEvent, timezone: string) {
  const from = session.date + "T" + session.start;
  const finish = timeToMinutes(session.start) + session.minutes;
  const end = finish === 1440
    ? (() => { const d = new Date(session.date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) + "T00:00"; })()
    : session.date + "T" + String(Math.floor(finish/60)).padStart(2, "0") + ":" + String(finish%60).padStart(2, "0");
  const eventStart = event.allDay ? event.start.slice(0,10) + "T00:00" : isoLocal(event.start, timezone);
  const eventEnd = event.allDay ? event.end.slice(0,10) + "T00:00" : isoLocal(event.end, timezone);
  return from < eventEnd && eventStart < end;
}
function withinHorizon(date: string, timezone: string, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year:"numeric",month:"2-digit",day:"2-digit" }).formatToParts(now);
  const get = (part:string)=>today.find(x=>x.type===part)?.value ?? "";
  const start = get("year")+"-"+get("month")+"-"+get("day");
  const endDate = new Date(start+"T12:00:00Z");
  endDate.setUTCDate(endDate.getUTCDate()+21);
  return date >= start && date <= endDate.toISOString().slice(0,10);
}
function localDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (part: string) => parts.find(x => x.type === part)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}
export async function plannerAvailability(userId:string, from:string, to:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw new PlannerInputError("Invalid date range.");
  const span = (Date.parse(to+"T12:00:00Z")-Date.parse(from+"T12:00:00Z")) / 86400000;
  if (!Number.isFinite(span) || span > 21) throw new PlannerInputError("Date range must not exceed 21 days.");
  // Cover timezone offsets and DST at both boundaries; overlap filtering happens in the configured local zone.
  const min = new Date(from+"T12:00:00Z"); min.setUTCDate(min.getUTCDate()-1);
  const max = new Date(to+"T12:00:00Z"); max.setUTCDate(max.getUTCDate()+2);
  const calendar = await getAgendaEvents(userId,min.toISOString(),max.toISOString());
  if (!calendar.connected || calendar.needsReconnect) throw new PlannerConflictError("Calendar is not available.");
  // Do not expose appointment titles, locations or notes to an agent.
  const busy = calendar.events.filter(e=>e.source==="google"||e.source==="agenda")
    .map(e=>({start:e.start,end:e.end,allDay:e.allDay}));
  const state=await loadPersonalDataState(userId);
  return {revision:state.revision,timezone:state.snapshot.plannerPreferences.timezone,
    preferences:state.snapshot.plannerPreferences, busy, sessions:state.snapshot.plannerSessions.filter(s=>s.date>=from&&s.date<=to),
    fetchedAt:new Date().toISOString()};
}
export async function submitPlannerProposal(userId:string,input:unknown) {
  if (!record(input) || Object.keys(input).some(k=>!["revision","replaceFrom","sessions","requestId"].includes(k))
    || !Number.isSafeInteger(input.revision) || typeof input.replaceFrom !== "string"
    || !Array.isArray(input.sessions) || input.sessions.length<1 || input.sessions.length>20)
    throw new PlannerInputError("Invalid proposed plan.");
  if (input.requestId !== undefined && (typeof input.requestId !== "string" || !/^[0-9a-f-]{36}$/.test(input.requestId))) throw new PlannerInputError("Invalid request ID.");
  const current = await loadPersonalDataState(userId);
  if (current.revision !== input.revision) throw new PlannerConflictError("Plan changed; retrieve fresh availability.");
  const zone=current.snapshot.plannerPreferences.timezone;
  const now=new Date();
  const replaceFrom=input.replaceFrom as string;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(replaceFrom)||!withinHorizon(replaceFrom,zone,now))
    throw new PlannerInputError("Invalid replan start date.");
  const rows:PlannerSession[]=[];
  for (const candidate of input.sessions) {
    if (!record(candidate) || Object.keys(candidate).some(k=>!["id","date","start","minutes","title","work","estimateMinutes"].includes(k))) throw new PlannerInputError("Invalid session.");
    const session = normalizePlannerSession({
      id: typeof candidate.id==="string"&&candidate.id.length<=100 ? candidate.id : createId(),
      date:candidate.date, start:candidate.start, minutes:candidate.minutes, title:candidate.title,
      estimateMinutes:candidate.estimateMinutes ?? candidate.minutes,
      work:candidate.work, locked:false,origin:"assistant",createdAt:new Date().toISOString(),
    });
    if (!session || !withinHorizon(session.date,zone,now) || session.date<replaceFrom
      || [0,6].includes(new Date(session.date+"T12:00:00Z").getUTCDay()))
      throw new PlannerInputError("Invalid proposed workday or session.");
    if (rows.some(s=>s.id===session.id)) throw new PlannerInputError("Duplicate session ID.");
    rows.push(session);
  }
  const to=rows.reduce((max,s)=>s.date>max?s.date:max,replaceFrom);
  const today=localDate(now,zone);
  const availability=await plannerAvailability(userId,replaceFrom,to);
  if (availability.revision!==input.revision) throw new PlannerConflictError("Calendar or plan changed; retry.");
  const existing=current.snapshot.plannerSessions.filter(s=>!plannerSessionInReplacementWindow(s,replaceFrom,to,today));
  for (const session of rows) {
    const issue=validatePlannerSession(session,[...existing,...rows.filter(s=>s.id!==session.id)],current.snapshot.items,[]);
    if (issue) throw new PlannerInputError(issue);
    if (availability.busy.some(e=>conflictWithEvent(session,e,zone))) throw new PlannerInputError("Fixed calendar commitment overlaps a proposed session.");
  }
  const sql=getDatabase();
  return sql.begin(async tx=>{
    const [row]=await tx<{revision:number|string;snapshot:unknown}[]>`
      select revision,snapshot from personal_data_state where user_id=${userId} for update
    `;
    if(!row || Number(row.revision)!==input.revision) throw new PlannerConflictError("State changed; retrieve a new plan.");
    if(input.requestId) {
      const [queued]=await tx<{week_start:Date|string}[]>`
        select week_start from planner_requests where user_id=${userId} and id=${input.requestId as string} and processed_at is null for update
      `;
      if(!queued) throw new PlannerConflictError("Requested planning job is not pending.");
      const start=new Date(replaceFrom+"T12:00:00Z");
      start.setUTCDate(start.getUTCDate() - (start.getUTCDay()+6)%7);
      const target=queued.week_start instanceof Date ? queued.week_start.toISOString().slice(0,10) : String(queued.week_start).slice(0,10);
      if(start.toISOString().slice(0,10)!==target) throw new PlannerInputError("Request week does not match proposal.");
    }
    if (localDate(new Date(), zone) !== today) throw new PlannerConflictError("Day changed; retrieve a new plan.");
    const snapshot=normalizePersonalDataSnapshot(row.snapshot);
    const retained=snapshot.plannerSessions.filter(s=>!plannerSessionInReplacementWindow(s,replaceFrom,to,today));
    // Recheck against the transactional version, never erase protected sessions.
    for(const session of rows) {
      const issue=validatePlannerSession(session,[...retained,...rows.filter(s=>s.id!==session.id)],snapshot.items,[]);
      if(issue) throw new PlannerConflictError(issue);
    }
    const next={...snapshot,plannerSessions:[...retained,...rows]};
    const [saved]=await tx<{revision:number|string}[]>`
      update personal_data_state set snapshot=${tx.json(next)},revision=revision+1,updated_at=now()
      where user_id=${userId} returning revision
    `;
    if(input.requestId) await tx`
      update planner_requests set processed_at=now() where user_id=${userId} and id=${input.requestId as string} and processed_at is null
    `;
    return {saved:true,revision:Number(saved.revision),count:rows.length,calendarCheckedAt:availability.fetchedAt};
  });
}
