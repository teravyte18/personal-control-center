"use client";

import { summarizePlannerSessions } from "@/domain/planner-insights";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getOpenProjectActions, isOpenTask, useDataConnection, usePersonalData, usePlannerData } from "@/lib/personal-data";
import { getRhythmPeriod } from "@/domain/weekly-rhythm";
import { useCalendarCommitments } from "@/hooks/use-calendar-commitments";
import {
  createPlannerSession, dailyPlannerRequestInstructions, plannerWeekDays, reconcileSession,
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
function localToday() { const now=new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; }
function mondayFor(date:string) { const day=new Date(date+"T12:00:00Z"); const offset=(day.getUTCDay()+6)%7; day.setUTCDate(day.getUTCDate()-offset); return day.toISOString().slice(0,10); }
function minuteLabel(n: number) {
  return n < 60 ? n+" min" : (n / 60).toLocaleString(undefined,{maximumFractionDigits:1})+" h";
}
type PlannerDraft = {id:string;revision:number;replaceFrom:string;rationale:string;status:"draft"|"approved"|"rejected"|"conflict";conflictReason:string;appliedRevision:number|null;calendarSync:{attempted:boolean;succeeded:boolean;error:string}|null;createdAt:string;changes:{sessions:Array<PlannerSession & {priorityReason:string}>;removeSessionIds:string[]}};
const statuses: {value:PlannerOutcome;label:string}[] = [
  {value:"completed",label:"Completed"},
  {value:"partial",label:"In progress"},
  {value:"skipped",label:"Skipped"},
  {value:"postponed",label:"Postponed"},
  {value:"not-started",label:"Not started (legacy)"},
  {value:"cancelled",label:"No longer needed (legacy)"},
];
export default function PlannerPage() {
  const {items,loaded:itemsLoaded} = usePersonalData();
  const {refreshServerData} = useDataConnection();
  const {plannerSessions,plannerPreferences,upsertPlannerSession,deletePlannerSession,updatePlannerPreferences,loaded} = usePlannerData();
  const [weeksAhead,setWeeksAhead] = useState(0);
  const period = useMemo(() => selectedPeriod(weeksAhead), [weeksAhead]);
  const days = useMemo(() => plannerWeekDays(period.start),[period.start]);
  const calendarPeriod = useMemo(()=>({start:days[0] ?? period.start,end:days[4] ?? period.end}),[days,period]);
  const {result:calendar,error:calendarError,retry:retryCalendar} = useCalendarCommitments(calendarPeriod);
  const [date,setDate] = useState("");
  const [reportDate,setReportDate] = useState(localToday);
  const [start,setStart] = useState("10:30");
  const [minutes,setMinutes] = useState(120);
  const [title,setTitle] = useState("");
  const [workKey,setWorkKey] = useState("");
  const [message,setMessage] = useState("");
  const [feedback,setFeedback] = useState<Record<string,{outcome:PlannerOutcome;note:string;actual:string}>>({});
  const [showPreferences,setShowPreferences] = useState(false);
  const [instruction,setInstruction] = useState("");
  const [pendingRequests,setPendingRequests] = useState<Array<{id:string;weekStart:string;intent:string;instructions:string;processedAt:string|null;cancelledAt:string|null;dispatchState:"unknown"|"accepted"|"committed"|null}>>([]);
  const [proposals,setProposals] = useState<PlannerDraft[]>([]);
  const [draftBusy,setDraftBusy] = useState("");
  const [draftError,setDraftError] = useState("");
  const [queueBusy,setQueueBusy] = useState(false);
  const [queueError,setQueueError] = useState("");
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{
      try{
        const response=await fetch("/api/planner/requests",{cache:"no-store"});
        if(response.ok) {
          const data=await response.json() as {requests:typeof pendingRequests};
          if(active)setPendingRequests(data.requests);
        }
        const draftResponse=await fetch("/api/planner/proposals",{cache:"no-store"});
        if(draftResponse.ok) {
          const data=await draftResponse.json() as {proposals:PlannerDraft[]};
          if(active)setProposals(data.proposals);
        }
      }catch{/* Do not obscure locally saved sessions when request status is offline. */}
    };
    void refresh();
    const id=window.setInterval(()=>{void refresh();},30000);
    return ()=>{active=false;window.clearInterval(id);};
  },[]);
  async function decideDraft(id:string,decision:"approve"|"reject") {
    if(draftBusy)return;
    setDraftBusy(id);setDraftError("");
    try {
      const response=await fetch("/api/planner/proposals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,decision})});
      const data=await response.json() as {proposal?:PlannerDraft;error?:string};
      if(!response.ok || !data.proposal) throw new Error(data.error||"Could not update draft.");
      setProposals(current=>current.map(proposal=>proposal.id===id?data.proposal!:proposal));
      if(data.proposal.status==="approved") {
        await refreshServerData();
        setMessage(data.proposal.calendarSync?.succeeded?"Draft approved and Calendar synced.":"Draft approved, but Calendar sync failed. Check the connection status.");
      }
    } catch(error) {setDraftError(error instanceof Error?error.message:"Could not update draft.");}
    finally {setDraftBusy("");}
  }
  async function queuePlan(dateForReport:string) {
    if(queueBusy)return;
    const entries=plannerSessions.filter(session=>session.date===dateForReport&&session.outcome);
    const reports=entries.map(session=>{
      return {title:session.title,outcome:session.outcome!,note:session.note??"",actualMinutes:session.actualMinutes};
    });
    setQueueBusy(true);setQueueError("");
    try{
      const response=await fetch("/api/planner/requests",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({weekStart:mondayFor(dateForReport),intent:"replan",instructions:dailyPlannerRequestInstructions(dateForReport,reports,instruction)}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(typeof data.error==="string"?data.error:"Could not queue planning request.");
      setPendingRequests(v=>[data.request,...v]);
      setInstruction("");
      setMessage(data.request.dispatchState === "committed" ? "Request delivered. A draft still needs your approval." : data.request.dispatchState === "accepted" ? "Request accepted. Waiting for a draft." : data.request.dispatchState === "unknown" ? "Request saved. Delivery is uncertain; it will not be sent again automatically." : "Planning request queued. Private processing has not been enabled.");
    }catch(error){setQueueError(error instanceof Error?error.message:"Could not queue request.");}
    finally{setQueueBusy(false);}
  }
  async function cancelRequest(id:string) {
    try{
      const response=await fetch("/api/planner/requests",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      if(!response.ok)throw new Error();
      setPendingRequests(v=>v.filter(request=>request.id!==id));
    }catch{setQueueError("Could not cancel the request.");}
  }
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
  const insight = useMemo(()=>{
    const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-28);
    return summarizePlannerSessions(plannerSessions,cutoff.toISOString().slice(0,10),new Date().toISOString().slice(0,10));
  },[plannerSessions]);
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
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-xl font-semibold">Daily check-in</h3><p className="pcc-context">Review this date’s sessions together. Save outcomes first; requesting a replan queues one grouped request and never changes the plan automatically.</p></div><label className="text-sm">Date<input type="date" className="mt-1 block rounded-lg border p-2" value={reportDate} onChange={event=>setReportDate(event.target.value)}/></label></div>
      {plannerSessions.filter(session=>session.date===reportDate).length===0?<p className="pcc-context">No sessions scheduled for this date.</p>:plannerSessions.filter(session=>session.date===reportDate).sort((a,b)=>a.start.localeCompare(b.start)).map(session=>{
        const state=feedback[session.id] ?? {outcome:session.outcome??"partial",note:session.note??"",actual:session.actualMinutes?.toString()??""};
        return <article key={session.id} className="rounded-xl border p-3 space-y-2"><p className="text-sm font-semibold">{session.start} · {minuteLabel(session.minutes)} · {session.title}</p><label className="block text-sm">Outcome<select className="mt-1 block w-full rounded-lg border p-2" value={state.outcome} onChange={event=>setFeedback(current=>({...current,[session.id]:{...state,outcome:event.target.value as PlannerOutcome}}))}>{statuses.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="block text-sm">Note (optional)<textarea rows={2} maxLength={4000} className="mt-1 block w-full rounded-lg border p-2" value={state.note} onChange={event=>setFeedback(current=>({...current,[session.id]:{...state,note:event.target.value}}))}/></label><div className="flex flex-wrap items-end gap-2"><label className="text-sm">Actual minutes (optional)<input className="mt-1 block w-32 rounded-lg border p-2" type="number" min={0} max={1440} value={state.actual} onChange={event=>setFeedback(current=>({...current,[session.id]:{...state,actual:event.target.value}}))}/></label><button type="button" className="min-h-11 rounded-xl border px-4 text-sm font-semibold" onClick={()=>saveOutcome(session)}>Save outcome</button></div></article>;
      })}
      <label className="block text-sm">What should change? (optional)<textarea value={instruction} onChange={event=>setInstruction(event.target.value)} maxLength={1500} className="mt-1 w-full rounded-lg border p-2" placeholder="Optional guidance for the grouped replan" rows={2}/></label>
      <button type="button" disabled={queueBusy} onClick={()=>{void queuePlan(reportDate);}} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{queueBusy?"Queuing…":"Request grouped replan"}</button>
      {queueError&&<p role="alert" className="text-sm">{queueError}</p>}
    </div>
    <div className="space-y-3">
      <h3 className="text-xl font-semibold">Scheduled work</h3>
      {sorted.length===0&&<p className="pcc-context">No work sessions are planned yet. The rest of the week remains flexible.</p>}
      {days.map(day=><div key={day} className="rounded-2xl border p-4 space-y-3">
        <h4 className="font-semibold">{dateDisplay(day)}</h4>
        {!sorted.some(s=>s.date===day)&&<p className="pcc-context">Open / flexible</p>}
        {sorted.filter(s=>s.date===day).map(s=>{
          return <div key={s.id} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-sm font-semibold">{timeLabel(s.start)} · {minuteLabel(s.minutes)}</p><p>{s.title}</p>{s.outcome&&<p className="pcc-context">Last outcome: {statuses.find(o=>o.value===s.outcome)?.label}</p>}</div>
              <button type="button" className="text-sm underline" onClick={()=>deletePlannerSession(s.id)}>Remove</button>
            </div>
            {s.outcome&&<p className="pcc-context">Outcome: {statuses.find(option=>option.value===s.outcome)?.label}</p>}
          </div>;
        })}
      </div>)}
    </div>
    <div className="rounded-2xl border p-4 space-y-3">
      <h3 className="font-semibold">Recent activity · 28 days</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><p className="pcc-context">Completed</p><p className="text-xl font-semibold">{insight.completed}</p></div>
        <div><p className="pcc-context">Still in progress</p><p className="text-xl font-semibold">{insight.partial}</p></div>
        <div><p className="pcc-context">Skipped</p><p className="text-xl font-semibold">{insight.skipped}</p></div>
        <div><p className="pcc-context">Not started (legacy)</p><p className="text-xl font-semibold">{insight.notStarted}</p></div>
        <div><p className="pcc-context">Postponed</p><p className="text-xl font-semibold">{insight.postponed}</p></div>
        <div><p className="pcc-context">Unconfirmed</p><p className="text-xl font-semibold">{insight.unconfirmed}</p></div>
        <div><p className="pcc-context">Recorded effort</p><p className="text-xl font-semibold">{minuteLabel(insight.effort.actualMinutes)}</p></div>
      </div>
      <p className="pcc-context">Outcomes confirmed for {insight.confirmed} sessions; effort is only the sum of sessions where you entered actual minutes ({insight.effort.recorded}). Unconfirmed is not counted as missed.</p>
      <p className="pcc-context">Morning engagement: {insight.morning.engaged} of {insight.morning.confirmed} confirmed morning sessions. Engaged means completed or partially completed.</p>
      {insight.effort.ratio!==null&&<p className="pcc-context">Actual / estimated effort (recorded sessions only): {insight.effort.ratio.toFixed(2)}×. Interpret cautiously if only a few sessions have actual effort.</p>}
      {insight.suggestions.length>0&&<div className="space-y-2"><h4 className="font-semibold text-sm">Possible adjustments to test</h4>{insight.suggestions.map(s=><p key={s} className="pcc-context">{s}</p>)}</div>}
    </div>
    <div className="rounded-2xl border p-4 space-y-3">
      <h3 className="font-semibold">Assistant plan drafts</h3>
      {proposals.length===0&&<p className="pcc-context">No assistant drafts yet. Submissions appear here for your review before any session changes.</p>}
      {draftError&&<p role="alert" className="text-sm">{draftError}</p>}
      {proposals.map(proposal=><article key={proposal.id} className="rounded-xl border p-3 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-semibold">{proposal.status==="draft"?"Ready to review":proposal.status==="approved"?"Approved":proposal.status==="rejected"?"Rejected":"Needs a new plan"} · {proposal.replaceFrom}</h4><p className="pcc-context">Snapshot {proposal.revision}</p></div>
        <p className="text-sm">{proposal.rationale}</p>
        {proposal.changes.sessions.map(session=><div key={session.id} className="rounded-lg border p-2 text-sm">
          <p className="font-semibold">{dateDisplay(session.date)} · {session.start} · {minuteLabel(session.minutes)} · {session.title}</p>
          <p>Estimated effort: {minuteLabel(session.estimateMinutes)}. {session.priorityReason}</p>
          <p className="pcc-context">{session.work.length?session.work.map(ref=>work.find(option=>workId(option.ref)===workId(ref))?.title||`${ref.sourceType} ${ref.sourceItemId}`).join(", "):"No linked Task or Project Action"}</p>
          <p className="pcc-context">{plannerSessions.some(existing=>existing.id===session.id)?"Move or update existing session":"New session"}</p>
        </div>)}
        {proposal.changes.removeSessionIds.length>0&&<p className="text-sm">Remove {proposal.changes.removeSessionIds.length} existing session(s): {proposal.changes.removeSessionIds.map(id=>plannerSessions.find(session=>session.id===id)?.title||id).join(", ")}</p>}
        {proposal.status==="conflict"&&<p role="status" className="text-sm">{proposal.conflictReason} No changes were applied. This draft remains available for reference.</p>}
        {proposal.status==="approved"&&<p role="status" className="text-sm">{proposal.calendarSync?.succeeded?"Calendar synced.":proposal.calendarSync?`Calendar sync failed: ${proposal.calendarSync.error}`:"Calendar sync result pending. Refresh to check."}</p>}
        {proposal.status==="draft"&&<div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(draftBusy)} onClick={()=>{void decideDraft(proposal.id,"approve");}} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">{draftBusy===proposal.id?"Checking…":"Approve changes"}</button><button type="button" disabled={Boolean(draftBusy)} onClick={()=>{void decideDraft(proposal.id,"reject");}} className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-50">Reject</button></div>}
      </article>)}
    </div>
    <div className="rounded-2xl border p-4 space-y-2">
      <h3 className="font-semibold">OpenClaw planning requests</h3>
      <p className="pcc-context">Request a plan or replan for this week. If private processing is enabled, Rem can check current tasks and Calendar and submit a draft. Sessions change only after you approve.</p>
      <textarea value={instruction} onChange={e=>setInstruction(e.target.value)} maxLength={2000} className="w-full rounded-lg border p-2" placeholder="Optional: Keep unfinished work from the same project first; move my deep work later tomorrow…" rows={3}/>
      <button type="button" disabled={queueBusy} onClick={()=>{void queuePlan(reportDate);}} className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-50">{queueBusy?"Queuing…":"Request plan / replan"}</button>
      {queueError&&<p role="alert" className="text-sm">{queueError}</p>}
      {pendingRequests.filter(request=>request.processedAt===null && request.cancelledAt===null).map(request=><div key={request.id} className="flex justify-between items-start gap-2 rounded-xl border p-3">
        <div><p className="text-sm font-semibold">Pending · {request.weekStart}</p><p className="pcc-context">{request.dispatchState==="committed"?"Delivered · waiting for a draft":request.dispatchState==="accepted"?"Accepted · waiting for delivery confirmation":request.dispatchState==="unknown"?"Delivery uncertain · no automatic resend":"Queued · private processing not enabled"}</p><p className="pcc-context">{request.instructions||"Use current priorities and preferences"}</p></div>
        <button type="button" className="text-sm underline" onClick={()=>{void cancelRequest(request.id);}}>Cancel</button>
      </div>)}
    </div>
  </section>;
}
