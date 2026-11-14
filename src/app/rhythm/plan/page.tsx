"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { getOpenProjectActions, isOpenTask, usePersonalData, usePlannerData } from "@/lib/personal-data";
import { getRhythmPeriod } from "@/domain/weekly-rhythm";
import { useCalendarCommitments } from "@/hooks/use-calendar-commitments";
import {
  createPlannerSession, plannerWeekDays, reconcileSession,
  validatePlannerSession, type PlannerOutcome, type PlannerSession, type PlannerWorkRef,
} from "@/domain/weekly-planner";

const timeLabel = (value: string) => value;
function selectedPeriod(weeksAhead: number) {
  const reference = new Date();
  reference.setDate(reference.getDate() + weeksAhead * 7);
  return getRhythmPeriod(reference);
}
function workId(ref: PlannerWorkRef) {
  return ref.sourceType + "|" + ref.sourceItemId + "|" + (ref.sourceActionId ?? "");
}
function dateDisplay(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
}
function minuteLabel(n: number) {
  return n < 60 ? n+" min" : (n / 60).toLocaleString(undefined,{maximumFractionDigits:1})+" h";
}
const statuses: {value:PlannerOutcome;label:string}[] = [
  {value:"completed",label:"Completed"},
  {value:"partial",label:"In progress"},
  {value:"not-started",label:"Not started"},
  {value:"cancelled",label:"No longer needed"},
];
export default function PlannerPage() {
  const {items,loaded:itemsLoaded} = usePersonalData();
  const {plannerSessions,plannerPreferences,upsertPlannerSession,deletePlannerSession,updatePlannerPreferences,loaded} = usePlannerData();
  const [weeksAhead,setWeeksAhead] = useState(0);
  const period = useMemo(() => selectedPeriod(weeksAhead), [weeksAhead]);
  const days = useMemo(() => plannerWeekDays(period.start),[period.start]);
  const calendarPeriod = useMemo(()=>({start:days[0] ?? period.start,end:days[4] ?? period.end}),[days,period]);
  const {result:calendar,error:calendarError,retry:retryCalendar} = useCalendarCommitments(calendarPeriod);
  const [date,setDate] = useState("");
  const [start,setStart] = useState("10:30");
  const [minutes,setMinutes] = useState(120);
  const [title,setTitle] = useState("");
  const [workKey,setWorkKey] = useState("");
  const [message,setMessage] = useState("");
  const [feedback,setFeedback] = useState<Record<string,{outcome:PlannerOutcome;note:string;actual:string}>>({});
  const [showPreferences,setShowPreferences] = useState(false);
  const [instruction,setInstruction] = useState("");
  const work = useMemo(()=>{
    const result:{key:string;title:string;ref:PlannerWorkRef}[]=[];
    for (const item of items) {
      if (isOpenTask(item)) result.push({key:workId({sourceType:"task",sourceItemId:item.id}),title:item.title,ref:{sourceType:"task",sourceItemId:item.id}});
      if (item.kind==="project" && !["completed","archived"].includes(item.status))
        for (const action of getOpenProjectActions(item)) result.push({
          key:workId({sourceType:"project-action",sourceItemId:item.id,sourceActionId:action.id}),
          title:item.title+" / "+action.title,ref:{sourceType:"project-action",sourceItemId:item.id,sourceActionId:action.id},
        });
    }
    return result;
  },[items]);
  const activeCommitments = useMemo(() => (calendar?.events ?? []).filter(e=>e.source==="google"||e.source==="agenda"),[calendar]);
  const calendarReady = Boolean(calendar && !calendarError && (calendar.connected || calendar.events.length > 0));
  const sorted = useMemo(()=>plannerSessions.filter(s=>days.includes(s.date)).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)),[plannerSessions,days]);
  const firstDate = date || days[0] || "";
  function addSession(event:FormEvent) {
    event.preventDefault();
    const selected=work.find(w=>w.key===workKey);
    const session=createPlannerSession({date:firstDate,start,minutes,title:title.trim()||selected?.title||"Focus session",work:selected?[selected.ref]:[]});
    const issue=validatePlannerSession(session,plannerSessions,items,calendarReady?activeCommitments:[]);
    if(issue) {setMessage(issue);return;}
    upsertPlannerSession(session);
    setMessage(calendarReady?"Session added.":"Session added; calendar availability has not been verified.");
    setTitle("");
  }
  function proposeStarter() {
    if(!calendarReady) {setMessage("Connect or refresh Google Calendar before generating a plan. Free time cannot be confirmed.");return;}
    const preferred=work.filter(w=>w.ref.sourceType==="project-action");
    const candidates=preferred.length?preferred:work;
    if(!candidates.length) {setMessage("Add an open Task or Project Action first.");return;}
    const planned=[...plannerSessions];
    const added:PlannerSession[]=[];
    const target=Math.min(plannerPreferences.targetThesisSessions,days.length);
    for(const day of days) {
      if(added.length>=target) break;
      const startMinutes=(Number(plannerPreferences.start.slice(0,2))*60+Number(plannerPreferences.start.slice(3)))+plannerPreferences.morningBufferMinutes;
      const hh=String(Math.floor(startMinutes/60)).padStart(2,"0")+":"+String(startMinutes%60).padStart(2,"0");
      const selected=candidates[added.length%candidates.length];
      const session=createPlannerSession({date:day,start:hh,minutes:plannerPreferences.thesisSessionMinutes,title:selected.title,work:[selected.ref]});
      if(!validatePlannerSession(session,planned,items,activeCommitments)){
        planned.push(session);added.push(session);
      }
    }
    for(const session of added)upsertPlannerSession(session);
    setMessage(added.length ? "Added "+added.length+" suggested sessions. This is a basic rule-based starting plan, not an OpenClaw-generated plan. Review it before relying on it." : "No non-conflicting morning slots found. Adjust your hours or existing commitments.");
  }
  function saveOutcome(session:PlannerSession) {
    const state=feedback[session.id] ?? {outcome:session.outcome??"partial",note:session.note??"",actual:session.actualMinutes?.toString()??""};
    const actual=state.actual.trim()?Number(state.actual):undefined;
    if(actual!==undefined && (!Number.isInteger(actual)||actual<0||actual>1440)){setMessage("Actual effort must be between 0 and 1440 minutes.");return;}
    upsertPlannerSession(reconcileSession(session,state.outcome,state.note,actual));
    setMessage("Check-in saved. Your note remains available for future planning context.");
  }
  if(!loaded || !itemsLoaded) return <p className="pcc-context">Loading planner…</p>;
  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <nav className="flex gap-3 text-sm"><Link href="/rhythm" className="underline">Week overview</Link><span aria-current="page" className="font-semibold">Plan</span></nav>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Work planner</h2>
        <p className="pcc-context">{weeksAhead === 0 ? "Current" : "Next"} Monday–Friday · {days[0]?dateDisplay(days[0]):""}–{days[4]?dateDisplay(days[4]):""}</p>
        <div className="mt-2 flex gap-2"><button type="button" className="rounded-lg border px-3 py-2 text-sm" aria-pressed={weeksAhead===0} onClick={()=>{setWeeksAhead(0);setDate("");}}>This week</button><button type="button" className="rounded-lg border px-3 py-2 text-sm" aria-pressed={weeksAhead===1} onClick={()=>{setWeeksAhead(1);setDate("");}}>Next week</button></div>
      </div>
      <button type="button" onClick={()=>setShowPreferences(v=>!v)} className="min-h-11 rounded-xl border px-4 text-sm">Preferences</button>
    </header>
    <p className="pcc-context">Sessions are planning suggestions, not new Tasks. Missing an appointment or session never completes the original work. No timer is required.</p>
    {showPreferences && <div className="rounded-2xl border p-4 space-y-3">
      <h3 className="font-semibold">Planning preferences</h3>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Start <input className="block rounded-lg border p-2" type="time" value={plannerPreferences.start} onChange={e=>updatePlannerPreferences({...plannerPreferences,start:e.target.value})}/></label>
        <label className="text-sm">Morning buffer (min) <input className="block w-28 rounded-lg border p-2" type="number" min={0} max={120} step={15} value={plannerPreferences.morningBufferMinutes} onChange={e=>updatePlannerPreferences({...plannerPreferences,morningBufferMinutes:Number(e.target.value)})}/></label>
        <label className="text-sm">Morning sessions / week <input className="block w-28 rounded-lg border p-2" type="number" min={0} max={7} value={plannerPreferences.targetThesisSessions} onChange={e=>updatePlannerPreferences({...plannerPreferences,targetThesisSessions:Number(e.target.value)})}/></label>
      </div>
      <label className="block text-sm">Agent planning preferences
        <textarea className="mt-1 block w-full rounded-lg border p-2" rows={3} maxLength={2000} value={plannerPreferences.notes} onChange={e=>updatePlannerPreferences({...plannerPreferences,notes:e.target.value})}/>
      </label>
    </div>}
    <div className="rounded-2xl border p-4 space-y-3">
      <h3 className="font-semibold">Create your plan</h3>
      <p className="pcc-context">{calendarReady?"Calendar commitments loaded.":"Calendar unavailable or disconnected. Automatic slot selection is disabled."}</p>
      {calendarError && <button type="button" className="underline text-sm" onClick={retryCalendar}>Retry calendar</button>}
      <button type="button" onClick={proposeStarter} className="min-h-11 rounded-xl border px-4 text-sm font-semibold">Suggest morning sessions</button>
      <form onSubmit={addSession} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Day<select className="block w-full rounded-lg border p-2" value={firstDate} onChange={e=>setDate(e.target.value)}>{days.map(d=><option key={d} value={d}>{dateDisplay(d)}</option>)}</select></label>
        <label className="text-sm">Existing work<select className="block w-full rounded-lg border p-2" value={workKey} onChange={e=>setWorkKey(e.target.value)}><option value="">Independent session / admin</option>{work.map(w=><option key={w.key} value={w.key}>{w.title}</option>)}</select></label>
        <label className="text-sm">Start<input className="block w-full rounded-lg border p-2" type="time" value={start} onChange={e=>setStart(e.target.value)} required/></label>
        <label className="text-sm">Duration (minutes)<input className="block w-full rounded-lg border p-2" type="number" min={15} max={480} step={15} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} required/></label>
        <label className="text-sm md:col-span-2">Title (optional if linked to work)<input className="block w-full rounded-lg border p-2" maxLength={300} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <button className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white md:col-span-2" type="submit">Add work session</button>
      </form>
      {message&&<p role="status" className="text-sm">{message}</p>}
    </div>
    <div className="space-y-3">
      <h3 className="text-xl font-semibold">Scheduled work</h3>
      {sorted.length===0&&<p className="pcc-context">No work sessions are planned yet. The rest of the week remains flexible.</p>}
      {days.map(day=><div key={day} className="rounded-2xl border p-4 space-y-3">
        <h4 className="font-semibold">{dateDisplay(day)}</h4>
        {!sorted.some(s=>s.date===day)&&<p className="pcc-context">Open / flexible</p>}
        {sorted.filter(s=>s.date===day).map(s=>{
          const state=feedback[s.id] ?? {outcome:s.outcome??"partial",note:s.note??"",actual:s.actualMinutes?.toString()??""};
          return <div key={s.id} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-sm font-semibold">{timeLabel(s.start)} · {minuteLabel(s.minutes)}</p><p>{s.title}</p>{s.outcome&&<p className="pcc-context">Last outcome: {statuses.find(o=>o.value===s.outcome)?.label}</p>}</div>
              <button type="button" className="text-sm underline" onClick={()=>deletePlannerSession(s.id)}>Remove</button>
            </div>
            <label className="block text-sm">Session outcome
              <select className="mt-1 block w-full rounded-lg border p-2" value={state.outcome} onChange={e=>setFeedback(v=>({...v,[s.id]:{...state,outcome:e.target.value as PlannerOutcome}}))}>{statuses.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </label>
            <label className="block text-sm">What happened? Anything to revisit, estimate differently, or add to your tasks?
              <textarea rows={2} maxLength={4000} className="mt-1 block w-full rounded-lg border p-2" value={state.note} onChange={e=>setFeedback(v=>({...v,[s.id]:{...state,note:e.target.value}}))}/>
            </label>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-sm">Actual minutes (optional)<input className="block w-32 rounded-lg border p-2" type="number" min={0} max={1440} value={state.actual} onChange={e=>setFeedback(v=>({...v,[s.id]:{...state,actual:e.target.value}}))}/></label>
              <button type="button" className="min-h-11 rounded-xl border px-4 text-sm font-semibold" onClick={()=>saveOutcome(s)}>Save check-in</button>
            </div>
          </div>;
        })}
      </div>)}
    </div>
    <div className="rounded-2xl border p-4 space-y-2">
      <h3 className="font-semibold">Refine with OpenClaw</h3>
      <p className="pcc-context">Natural-language planning is not connected yet. Notes are stored in PCC, and the assistant integration must be extended before they can be read or changed by OpenClaw.</p>
      <textarea value={instruction} onChange={e=>setInstruction(e.target.value)} className="w-full rounded-lg border p-2" placeholder="Example: Move unfinished work to the next free morning…" rows={2}/>
      <button type="button" disabled={!instruction.trim()} onClick={()=>{void navigator.clipboard.writeText(instruction);setMessage("Instruction copied. No schedule was changed.");}} className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-50">Copy instruction</button>
    </div>
  </section>;
}
