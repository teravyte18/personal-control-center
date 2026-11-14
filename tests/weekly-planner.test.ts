import assert from "node:assert/strict";
import test from "node:test";
import {
 createPlannerSession, defaultPlannerPreferences, normalizePlannerSession, normalizePlannerState,
 plannerSessionInReplacementWindow,
 plannerWeekDays, reconcileSession, sessionOverlaps, validatePlannerSession,
} from "../src/domain/weekly-planner.ts";
import { applyPersonalDataMutation, emptyPersonalDataSnapshot, normalizePersonalDataMutation, normalizePersonalDataSnapshot } from "../src/domain/personal-data-snapshot.ts";
import type { Item } from "../src/domain/personal-data.ts";
import { assistantRead } from "../src/domain/assistant-read.ts";

const task:Item = {
 id:"task-1",title:"Review report",description:"",actions:[],kind:"task",status:"active",area:"personal",
 createdAt:"2026-11-01T00:00:00.000Z",updatedAt:"2026-11-01T00:00:00.000Z",
};
const now = new Date("2026-11-14T10:00:00Z");
const make = (date="2026-11-16",start="10:30") => createPlannerSession({
 date,start,minutes:120,title:"Review report",work:[{sourceType:"task",sourceItemId:task.id}],
},now);

test("planner retains Saturday-Friday week boundary, schedules Monday-Friday only",()=>{
 assert.deepEqual(plannerWeekDays("2026-11-14"),["2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-20"]);
 assert.deepEqual(plannerWeekDays("2026-11-16"),[]);
});
test("assistant replacement is bounded to the proposal window and future dates",()=>{
 const sample=(overrides:Partial<ReturnType<typeof make>>={})=>({
  ...make("2026-11-18"),origin:"assistant" as const,locked:false,...overrides,
 });
 const from="2026-11-16",to="2026-11-18",today="2026-11-17";
 assert.equal(plannerSessionInReplacementWindow(sample(),from,to,today),true);
 assert.equal(plannerSessionInReplacementWindow(sample({date:today}),from,to,today),false);
 assert.equal(plannerSessionInReplacementWindow(sample({date:"2026-11-19"}),from,to,today),false);
 assert.equal(plannerSessionInReplacementWindow(sample({date:"2026-11-15"}),from,to,today),false);
 assert.equal(plannerSessionInReplacementWindow(sample({origin:"manual"}),from,to,today),false);
 assert.equal(plannerSessionInReplacementWindow(sample({locked:true}),from,to,today),false);
 assert.equal(plannerSessionInReplacementWindow(sample({outcome:"partial"}),from,to,today),false);
});
test("planner normalization rejects invalid dates, times, duration and malformed references",()=>{
 const valid=make();
 assert.equal(normalizePlannerSession(valid)?.id,valid.id);
 assert.equal(normalizePlannerSession({...valid,date:"2026-02-30"}),null);
 assert.equal(normalizePlannerSession({...valid,start:"25:00"}),null);
 assert.equal(normalizePlannerSession({...valid,minutes:17}),null);
 assert.equal(normalizePlannerSession({...valid,work:[{sourceType:"project-action",sourceItemId:"x"}]}),null);
 const clean=normalizePlannerState({preferences:{...defaultPlannerPreferences,capacityPercent:150},sessions:[valid,valid,{}]});
 assert.equal(clean.sessions.length,1);
 assert.equal(clean.preferences.capacityPercent,65);
});
test("time blocks detect overlap, including adjacent slots and separate days",()=>{
 const a=make(), b=make("2026-11-16","12:30"), c=make("2026-11-16","12:15");
 assert.equal(sessionOverlaps(a,b),false);
 assert.equal(sessionOverlaps(a,c),true);
 assert.equal(sessionOverlaps(a,make("2026-11-17","10:30")),false);
});
test("conflicts with fixed events and stale canonical task references are rejected",()=>{
 const a=make();
 assert.equal(validatePlannerSession(a,[],[task]),null);
 assert.match(validatePlannerSession(a,[make("2026-11-16","11:00")],[task])??"",/overlaps/);
 assert.match(validatePlannerSession(a,[],[task],[{start:"2026-11-16T11:00:00",end:"2026-11-16T12:00:00",allDay:false}])??"",/commitment/);
 assert.match(validatePlannerSession(a,[],[{...task,status:"completed"}])??"",/no longer open/);
});
test("outcomes preserve notes, unfinished work and explicit actual effort",()=>{
 const a=make();const updated=reconcileSession(a,"partial","Unexpected research follow-up",180,now);
 assert.equal(updated.outcome,"partial");assert.equal(updated.note,"Unexpected research follow-up");
 assert.equal(updated.actualMinutes,180);assert.equal(updated.work[0].sourceItemId,"task-1");
 const mutation=normalizePersonalDataMutation({type:"upsert-planner-session",session:updated});
 assert.ok(mutation);
 const snapshot=applyPersonalDataMutation(emptyPersonalDataSnapshot,mutation);
 assert.equal(snapshot.plannerSessions.length,1);
 assert.equal(snapshot.plannerSessions[0].outcome,"partial");
 const restored=normalizePersonalDataSnapshot(JSON.parse(JSON.stringify(snapshot)));
 assert.equal(restored.plannerSessions[0].note,"Unexpected research follow-up");
 assert.equal(normalizePersonalDataMutation({type:"upsert-planner-session",session:{...a,minutes:-1}}),null);
});

test("scoped planning reader exposes bounded session notes and preferences without generic write access",()=>{
  const session=reconcileSession(make(),"partial","Next session: investigate a new detail.",150,now);
  const snapshot={...emptyPersonalDataSnapshot,plannerSessions:[session]};
  const result=assistantRead("planning",{timezone:"Europe/Lisbon",asOf:"2026-11-17T12:00:00Z",limit:25},{revision:1,snapshot},"fictional-owner",["projects","tasks","rhythm"],new Date("2026-11-17T12:00:00Z")) as {
    records:Array<{kind:string;note?:string;outcome?:string}>;plannerPreferences:{start:string};
  };
  const row=result.records.find(s=>s.kind==="planner-session");
  assert.equal(row?.note,"Next session: investigate a new detail.");
  assert.equal(row?.outcome,"partial");
  assert.equal(result.plannerPreferences.start,"10:00");
});
