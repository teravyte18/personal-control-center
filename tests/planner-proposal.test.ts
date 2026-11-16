import assert from "node:assert/strict";
import test from "node:test";
import { createPlannerSession } from "../src/domain/weekly-planner.ts";
import { conflictWithEvent, localPlannerClock, plannerBusyEvents, plannerBusyEventsInLocalDateRange, plannerCalendarCoverageIssue, reviewPlannerChanges, withinPlannerHorizon } from "../src/domain/planner-proposal.ts";
import type { Item } from "../src/domain/personal-data.ts";

const now = new Date("2026-11-16T12:00:00Z");
const task: Item = { id:"fictional-task",title:"Review a draft",description:"",actions:[],kind:"task",status:"active",area:"personal",createdAt:now.toISOString(),updatedAt:now.toISOString() };
const session = (id:string,date="2026-11-17",start="14:00") => ({...createPlannerSession({date,start,minutes:120,title:"Review a draft",work:[{sourceType:"task" as const,sourceItemId:task.id}]},now),id});
const review = (existing: ReturnType<typeof session>[], sessions: ReturnType<typeof session>[], removeSessionIds:string[]=[], items:Item[]=[task],time="13:00") =>
  reviewPlannerChanges(existing,{sessions,removeSessionIds},items,"2026-11-16","2026-11-16",time);

test("draft review preserves stable IDs and lets unlocked manual sessions move later today",()=>{
  const original={...session("stable","2026-11-16","14:00"),origin:"manual" as const};
  const result=review([original],[{...original,start:"16:00"}]);
  assert.ok(Array.isArray(result));
  assert.equal(result[0].id,"stable");
  assert.equal(result[0].origin,"manual");
  assert.equal(result[0].createdAt,original.createdAt);
});
test("draft review protects past, started, pinned and confirmed sessions",()=>{
  const cases=[session("past","2026-11-13"),session("started","2026-11-16","12:00"),{...session("pinned"),locked:true},{...session("confirmed"),outcome:"partial" as const,outcomeAt:now.toISOString()}];
  for(const original of cases) {
    assert.equal(typeof review([original],[],[original.id]),"string");
    assert.equal(typeof review([original],[{...original,start:"16:00"}]),"string");
  }
});
test("draft review rejects overlaps, stale source work and duplicate changes",()=>{
  const a=session("one"),b=session("two","2026-11-17","15:00");
  assert.match(String(review([], [a,b])),/overlap|conflict/);
  assert.match(String(review([], [a],[],[{...task,status:"completed"}])),/no longer open/);
  assert.match(String(review([a],[a],[a.id])),/invalid|Duplicate/);
});
test("planner horizon and local clock use configured zone and real dates",()=>{
  assert.deepEqual(localPlannerClock(new Date("2026-03-29T00:30:00Z"),"Europe/Lisbon"),{today:"2026-03-29",time:"00:30"});
  assert.deepEqual(localPlannerClock(new Date("2026-03-29T01:30:00Z"),"Europe/Lisbon"),{today:"2026-03-29",time:"02:30"});
  assert.equal(withinPlannerHorizon("2026-11-37","2026-11-16"),false);
  assert.equal(withinPlannerHorizon("2026-12-07","2026-11-16"),true);
  assert.equal(withinPlannerHorizon("2026-12-08","2026-11-16"),false);
});

test("review cannot remove or move an original session beyond the 21-day horizon",()=>{
  const outside=session("outside","2026-12-08");
  assert.match(String(review([outside],[],[outside.id])),/no longer movable/);
  assert.match(String(review([outside],[{...outside,date:"2026-12-07"}])),/no longer movable/);
  const boundary=session("boundary","2026-12-07");
  assert.ok(Array.isArray(review([boundary],[],[boundary.id])));
});

test("planner treats unmarked PCC events as busy but excludes known projections",()=>{
  const event=(source:string)=>({source,start:"2026-11-17T14:00:00Z",end:"2026-11-17T15:00:00Z",allDay:false});
  const busy=plannerBusyEvents([event("pcc"),event("agenda"),event("google"),event("planner-session"),event("task"),event("project-action")]);
  assert.equal(busy.length,3);
  assert.equal(busy.some(value=>conflictWithEvent(session("draft"),value,"UTC")),true);
});
test("approval fails closed when Calendar coverage is incomplete",()=>{
  assert.match(plannerCalendarCoverageIssue(false),/could not be fully verified/);
  assert.equal(plannerCalendarCoverageIssue(true),"");
});

test("approval busy checks include local timezone, DST and all-day commitments",()=>{
  const block=session("new","2026-03-30","10:00");
  assert.equal(conflictWithEvent(block,{start:"2026-03-30T08:30:00Z",end:"2026-03-30T09:30:00Z",allDay:false},"Europe/Lisbon"),true);
  assert.equal(conflictWithEvent(block,{start:"2026-03-30T07:00:00Z",end:"2026-03-30T08:00:00Z",allDay:false},"Europe/Lisbon"),false);
  assert.equal(conflictWithEvent(block,{start:"2026-03-30",end:"2026-03-31",allDay:true},"Europe/Lisbon"),true);
});

test("planner availability filters padded fetches to requested Lisbon dates across DST boundaries",()=>{
 const events=[
  {source:"google",start:"2026-03-27T22:30:00Z",end:"2026-03-27T23:30:00Z",allDay:false}, // local 27th only
  {source:"agenda",start:"2026-03-28T23:30:00Z",end:"2026-03-29T00:30:00Z",allDay:false}, // spans local 28th
  {source:"google",start:"2026-03-29T23:30:00Z",end:"2026-03-30T00:30:00Z",allDay:false}, // local 30th only
  {source:"pcc",start:"2026-03-29",end:"2026-03-30",allDay:true},
 ];
 const filtered=plannerBusyEventsInLocalDateRange(events,"2026-03-28","2026-03-29","Europe/Lisbon");
 assert.equal(filtered.length,2);
 assert.equal(filtered.some(event=>event.start==="2026-03-28T23:30:00Z"),true);
 assert.equal(filtered.some(event=>event.allDay),true);
});
