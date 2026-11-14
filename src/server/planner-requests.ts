import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/server/database";

export class PlannerRequestInputError extends Error {}
export type PlannerRequestRecord = {
  id: string; weekStart: string; intent: "generate"|"replan";
  instructions: string; createdAt: string; processedAt: string|null;
};
type Row = { id:string;week_start:string|Date;intent:"generate"|"replan";instructions:string;created_at:Date|string;processed_at:Date|string|null };
function dateOnly(value:Date|string){return value instanceof Date ? value.toISOString().slice(0,10) : String(value).slice(0,10);}
function iso(value:Date|string|null){return value===null?null:new Date(value).toISOString();}
function map(row:Row):PlannerRequestRecord{return {id:row.id,weekStart:dateOnly(row.week_start),intent:row.intent,instructions:row.instructions,createdAt:iso(row.created_at)!,processedAt:iso(row.processed_at)};}
export function validatePlannerRequest(input:unknown, now=new Date()) {
  if (!input || typeof input!=="object" || Array.isArray(input)) throw new PlannerRequestInputError("Invalid request.");
  const value=input as Record<string,unknown>;
  if (Object.keys(value).some(k=>!["weekStart","intent","instructions"].includes(k))
    || typeof value.weekStart!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.weekStart)
    || typeof value.intent!=="string" || !["generate","replan"].includes(value.intent)
    || (value.instructions!==undefined && (typeof value.instructions!=="string" || value.instructions.length>2000)))
    throw new PlannerRequestInputError("Invalid request.");
  const date=new Date(value.weekStart+"T12:00:00Z");
  if (!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value.weekStart||date.getUTCDay()!==1)
    throw new PlannerRequestInputError("Choose a Monday.");
  const delta=(date.getTime()-now.getTime())/86400000;
  if(delta < -8 || delta > 22) throw new PlannerRequestInputError("Plan a current or upcoming week.");
  return { weekStart:value.weekStart, intent:value.intent as "generate"|"replan",instructions:(value.instructions as string|undefined)?.trim()??"" };
}
export async function listPlannerRequests(userId:string, pendingOnly=false) {
  const sql=getDatabase();
  const rows=pendingOnly
    ? await sql<Row[]>`select id,week_start,intent,instructions,created_at,processed_at from planner_requests where user_id=${userId} and processed_at is null order by created_at asc limit 10`
    : await sql<Row[]>`select id,week_start,intent,instructions,created_at,processed_at from planner_requests where user_id=${userId} order by created_at desc limit 20`;
  return rows.map(map);
}
export async function createPlannerRequest(userId:string, input:unknown) {
  const value=validatePlannerRequest(input);
  const sql=getDatabase();
  return sql.begin(async tx=>{
    const [{count}]=await tx<{count:number}[]>`select count(*)::int as count from planner_requests where user_id=${userId} and processed_at is null`;
    if(count>=10) throw new PlannerRequestInputError("Too many outstanding planner requests.");
    const [row]=await tx<Row[]>`insert into planner_requests(id,user_id,week_start,intent,instructions)
      values(${randomUUID()},${userId},${value.weekStart},${value.intent},${value.instructions})
      returning id,week_start,intent,instructions,created_at,processed_at`;
    return map(row);
  });
}
export async function cancelPlannerRequest(userId:string,id:unknown) {
  if(typeof id!=="string" || !/^[0-9a-f-]{36}$/.test(id)) throw new PlannerRequestInputError("Invalid request ID.");
  const sql=getDatabase();
  await sql`delete from planner_requests where user_id=${userId} and id=${id} and processed_at is null`;
}
