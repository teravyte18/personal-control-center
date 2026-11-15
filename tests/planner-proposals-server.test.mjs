import assert from "node:assert/strict";
import test from "node:test";

// Opt-in fictional integration stack only. This never discovers a live origin.
const enabled = process.env.PCC_TEST_ALLOW_FICTIONAL_MUTATIONS === "1" && Boolean(process.env.PCC_TEST_BASE_URL);
const base = process.env.PCC_TEST_BASE_URL;
async function call(path,{cookie,token,method="GET",body,origin=base}={}) {
  const response=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{"Content-Type":"application/json",Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json(),cookie:response.headers.get("set-cookie")?.split(";",1)[0]};
}
function futureMonday() {
  const date=new Date(); date.setUTCHours(12,0,0,0);
  date.setUTCDate(date.getUTCDate()+((8-date.getUTCDay())%7||7));
  return date.toISOString().slice(0,10);
}
test("drafts persist independently, isolate accounts and grants, and rejection is idempotent",{skip:!enabled},async()=>{
  const owner=await call("/api/auth/login",{method:"POST",body:{email:"owner@example.test",password:"owner-bootstrap-password-123"}});
  assert.equal(owner.status,200);
  const ownerCookie=owner.cookie;
  const memberEmail=`planner-fixture-${Date.now()}@example.test`;
  const invite=await call("/api/admin/users",{cookie:ownerCookie,method:"POST",body:{email:memberEmail}});
  assert.equal(invite.status,200);
  const activation=await call("/api/auth/activate",{method:"POST",body:{token:new URL(invite.data.activationUrl).searchParams.get("token"),password:"fictional-member-password-123"}});
  assert.equal(activation.status,200);
  const member=await call("/api/auth/login",{method:"POST",body:{email:memberEmail,password:"fictional-member-password-123"}});
  assert.equal(member.status,200);
  const memberCookie=member.cookie;
  const readGrant=await call("/api/assistant-grants",{cookie:ownerCookie,method:"POST",body:{label:"Read fixture",domains:["projects","tasks","rhythm"]}});
  const planGrant=await call("/api/assistant-grants",{cookie:ownerCookie,method:"POST",body:{label:"Planner fixture",domains:["projects","tasks","rhythm"],plannerWrite:true}});
  assert.equal(planGrant.status,201);
  const state=await call("/api/personal-data",{cookie:ownerCookie});
  const monday=futureMonday();
  const payload={revision:state.data.revision,replaceFrom:monday,rationale:"Fictional priority review.",removeSessionIds:[],sessions:[{date:monday,start:"14:00",minutes:60,estimateMinutes:75,title:"Fictional report",work:[],priorityReason:"First open planning goal."}]};
  assert.equal((await call("/api/assistant/planner",{token:readGrant.data.token,method:"POST",body:payload})).status,403);
  const submitted=await call("/api/assistant/planner",{token:planGrant.data.token,method:"POST",body:payload});
  assert.equal(submitted.status,200);
  const id=submitted.data.draft.id;
  assert.equal((await call("/api/personal-data",{cookie:ownerCookie})).data.revision,payload.revision);
  const listed=await call("/api/planner/proposals",{cookie:ownerCookie});
  assert.equal(listed.data.proposals.find(row=>row.id===id)?.status,"draft");
  assert.equal((await call("/api/planner/proposals",{cookie:memberCookie})).data.proposals.some(row=>row.id===id),false);
  assert.equal((await call("/api/planner/proposals",{token:planGrant.data.token})).status,401);
  assert.equal((await call("/api/planner/proposals",{cookie:memberCookie,method:"POST",body:{id,decision:"reject"}})).status,400);
  assert.equal((await call("/api/planner/proposals",{cookie:ownerCookie,method:"POST",origin:"https://foreign.example.test",body:{id,decision:"reject"}})).status,403);
  for(let i=0;i<2;i++) {
    const rejected=await call("/api/planner/proposals",{cookie:ownerCookie,method:"POST",body:{id,decision:"reject"}});
    assert.equal(rejected.data.proposal.status,"rejected");
  }
  assert.equal((await call("/api/planner/proposals",{cookie:ownerCookie,method:"POST",body:{id,decision:"approve"}})).data.proposal.status,"rejected");
  assert.equal((await call("/api/personal-data",{cookie:ownerCookie})).data.revision,payload.revision);

  const stale=await call("/api/assistant/planner",{token:planGrant.data.token,method:"POST",body:{...payload,rationale:"A second fictional draft."}});
  assert.equal(stale.status,200);
  const mutation=await call("/api/personal-data/mutations",{cookie:ownerCookie,method:"POST",body:{type:"add-item",item:{id:`fictional-planner-${Date.now()}`,title:"Fictional filing",kind:"task",status:"active",area:"personal",actions:[],description:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}});
  assert.equal(mutation.status,200);
  for(let i=0;i<2;i++) {
    const decided=await call("/api/planner/proposals",{cookie:ownerCookie,method:"POST",body:{id:stale.data.draft.id,decision:"approve"}});
    assert.equal(decided.data.proposal.status,"conflict");
    assert.match(decided.data.proposal.conflictReason,/revision/);
  }
  const refreshed=await call("/api/personal-data",{cookie:ownerCookie});
  const unavailable=await call("/api/assistant/planner",{token:planGrant.data.token,method:"POST",body:{...payload,revision:refreshed.data.revision,rationale:"Calendar unavailable fixture."}});
  assert.equal(unavailable.status,200);
  const unavailableApproval=await call("/api/planner/proposals",{cookie:ownerCookie,method:"POST",body:{id:unavailable.data.draft.id,decision:"approve"}});
  assert.equal(unavailableApproval.data.proposal.status,"conflict");
  assert.match(unavailableApproval.data.proposal.conflictReason,/Calendar/);
  assert.equal((await call("/api/personal-data",{cookie:ownerCookie})).data.revision,refreshed.data.revision);

  const queued=await call("/api/planner/requests",{cookie:ownerCookie,method:"POST",body:{weekStart:monday,intent:"replan",instructions:"Fictional priority review."}});
  assert.equal(queued.status,201);
  const requested={...payload,revision:refreshed.data.revision,requestId:queued.data.request.id,rationale:"Queued fictional draft."};
  const first=await call("/api/assistant/planner",{token:planGrant.data.token,method:"POST",body:requested});
  const retry=await call("/api/assistant/planner",{token:planGrant.data.token,method:"POST",body:requested});
  assert.equal(first.status,200);
  assert.equal(retry.data.draft.id,first.data.draft.id);
  assert.equal((await call("/api/planner/requests",{cookie:ownerCookie})).data.requests.find(row=>row.id===queued.data.request.id)?.processedAt !== null,true);
});
