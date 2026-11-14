import assert from "node:assert/strict";
import test from "node:test";
import { summarizePlannerSessions } from "../src/domain/planner-insights.ts";
import type { PlannerSession } from "../src/domain/weekly-planner.ts";
const session=(id:string,date:string, outcome:PlannerSession["outcome"],start="10:30",actualMinutes?:number):PlannerSession=>({
 id,date,start,minutes:120,title:"Fictional research",work:[],estimateMinutes:120,locked:false,createdAt:"2026-11-09T10:00:00Z",
 ...(outcome?{outcome,outcomeAt:"2026-11-09T16:00:00Z"}:{}),...(actualMinutes!==undefined?{actualMinutes}:{})
});
test("unconfirmed sessions are not silently treated as failures",()=>{
 const result=summarizePlannerSessions([session("a","2026-11-09",undefined),session("b","2026-11-10","not-started")],"2026-11-09","2026-11-15");
 assert.equal(result.unconfirmed,1);assert.equal(result.missed,1);assert.equal(result.confirmed,1);
 assert.equal(result.engaged,0);assert.match(result.suggestions[0],/more session outcomes/);
});
test("partial sessions count as engagement; long actual sessions inform estimates",()=>{
 const sessions=[session("1","2026-11-09","partial","10:30",220),session("2","2026-11-10","completed","10:30",200),
 session("3","2026-11-11","partial","10:30",180),session("4","2026-11-12","completed","10:30",200),
 session("5","2026-11-13","not-started","10:30")];
 const r=summarizePlannerSessions(sessions,"2026-11-09","2026-11-13");
 assert.equal(r.confirmed,5);assert.equal(r.engaged,4);assert.equal(r.morning.engaged,4);
 assert.equal(r.effort.recorded,4);assert.equal(r.effort.ratio,800/480);
 assert.ok(r.suggestions.some(x=>x.includes("exceeding their estimates")));
});
test("reporting excludes dates outside window",()=>{
 const r=summarizePlannerSessions([session("x","2026-11-01","completed")],"2026-11-09","2026-11-15");
 assert.equal(r.total,0);
});
