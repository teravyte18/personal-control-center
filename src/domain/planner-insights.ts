import type { PlannerSession } from "./weekly-planner.ts";

export type PlannerInsightSummary = {
  total:number; confirmed:number; unconfirmed:number; engaged:number;
  completed:number; partial:number; missed:number; cancelled:number;
  morning:{confirmed:number;engaged:number};
  effort:{recorded:number;actualMinutes:number;plannedMinutes:number;ratio:number|null};
  suggestions:string[];
};
/** Describe observed work without judging unknown outcomes as failures. */
export function summarizePlannerSessions(sessions:readonly PlannerSession[], since:string, until:string):PlannerInsightSummary {
  const sample=sessions.filter(s=>s.date>=since && s.date<=until);
  const confirmed=sample.filter(s=>Boolean(s.outcome));
  const morning=confirmed.filter(s=>Number(s.start.slice(0,2))<12);
  const effort=sample.filter(s=>s.actualMinutes!==undefined && s.outcome!=="cancelled");
  const plannedMinutes=effort.reduce((sum,s)=>sum+s.estimateMinutes,0);
  const actualMinutes=effort.reduce((sum,s)=>sum+(s.actualMinutes??0),0);
  const completion=confirmed.filter(s=>s.outcome==="completed").length;
  const partial=confirmed.filter(s=>s.outcome==="partial").length;
  const missed=confirmed.filter(s=>s.outcome==="not-started").length;
  const cancelled=confirmed.filter(s=>s.outcome==="cancelled").length;
  const engaged=completion+partial;
  const morningEngaged=morning.filter(s=>s.outcome==="completed"||s.outcome==="partial").length;
  const ratio=plannedMinutes>0?actualMinutes/plannedMinutes:null;
  const suggestions:string[]=[];
  if(confirmed.length<5) suggestions.push("Record a few more session outcomes before treating any productivity pattern as reliable.");
  else {
    if(morning.length>=5 && morningEngaged/morning.length<0.5) suggestions.push("Morning starts are frequently missed. Consider testing a later start or working away from home rather than simply rescheduling indefinitely.");
    if(missed>=4 && missed/confirmed.length>=0.4) suggestions.push("Several sessions were marked not started. Try fewer scheduled blocks and check whether work location or task clarity is the obstacle.");
    if(effort.length>=4 && ratio!==null && ratio>1.4) suggestions.push("Tasks with recorded effort are exceeding their estimates. Consider longer blocks and smaller actionable tasks.");
    if(engaged>=4 && engaged/confirmed.length>=0.7) suggestions.push("Your recent sessions show consistent engagement. You could consider a small, reversible increase in planned work.");
  }
  return {
    total:sample.length,confirmed:confirmed.length,unconfirmed:sample.length-confirmed.length,
    engaged,completed:completion,partial,missed,cancelled,
    morning:{confirmed:morning.length,engaged:morningEngaged},
    effort:{recorded:effort.length,actualMinutes,plannedMinutes,ratio},suggestions,
  };
}
