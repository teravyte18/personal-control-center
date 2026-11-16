import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlannerDispatchController } from './controller.mjs';
import { createDispatchServer } from './host.mjs';
const binding = {id:'fictional_binding_0001',agentId:'fixture',sessionKey:'agent:fixture:pcc-planner-fictional_private_0001',sessionId:'physical-fixture'};
const identity = {requestId:'00000000-0000-4000-8000-000000000001',dispatchId:'00000000-0000-4000-8000-000000000002'};
function fixture(options={}) {
  let saved=options.rows ?? [], sends=0; const calls=[];
  const raw={sessionKey:binding.sessionKey,sessionId:binding.sessionId,messages:[],sessionInfo:{activeLeafEntryId:null,hasActiveRun:false,activeRunIds:[]}};
  const controller=new PlannerDispatchController({binding,rows:saved,save:async rows=>{if(options.failSave)throw new Error('private storage');saved=structuredClone(rows);calls.push('save');},
    snapshot:async()=>raw,send:async body=>{calls.push('send');sends++;assert.equal(saved[0].state,'unknown');assert.deepEqual(Object.keys(body).sort(),['leaf','requestId','runId']);
      if(options.loseResponse)throw new Error('private runtime detail');return {runId:body.runId,status:'accepted'};}});
  return {controller,raw,calls,get saved(){return saved;},get sends(){return sends;}};
}
test('persist-before-send and replay deduplicate by exact pair; accepted is not committed',async()=>{
  const f=fixture();assert.equal((await f.controller.dispatch(identity)).state,'accepted');assert.equal(f.sends,1);assert.deepEqual(f.calls,['save','send','save']);
  assert.equal((await f.controller.dispatch(identity)).state,'accepted');assert.equal(f.sends,1);
  for(const extra of ['agentId','sessionKey','prompt','model','tool','userId'])await assert.rejects(f.controller.dispatch({...identity,[extra]:'foreign'}),{code:'invalid_input'});
  await assert.rejects(f.controller.dispatch({...identity,dispatchId:'00000000-0000-4000-8000-000000000003'}),{code:'invalid_input'});
  const restarted=fixture({rows:f.saved});await restarted.controller.dispatch(identity);assert.equal(restarted.sends,0);
});
test('lost response stays unknown across restart; only exact receipt proves commit, never text/inactivity',async()=>{
  const f=fixture({loseResponse:true});await assert.rejects(f.controller.dispatch(identity),{code:'outcome_unknown'});
  const restarted=fixture({rows:f.saved});assert.equal((await restarted.controller.status(identity)).state,'unknown');await restarted.controller.dispatch(identity);assert.equal(restarted.sends,0);
  restarted.raw.messages=[{role:'user',content:JSON.stringify({requestId:identity.requestId})}];assert.equal((await restarted.controller.status(identity)).state,'unknown');
  restarted.raw.inputReceipts=[{runId:'foreign',state:'consumed',consumedByEventId:'event-fixture'}];assert.equal((await restarted.controller.status(identity)).state,'unknown');
  restarted.raw.inputReceipts=[{runId:restarted.saved[0].runId,state:'consumed',consumedByEventId:'event-fixture'}];assert.equal((await restarted.controller.status(identity)).state,'committed');assert.equal(restarted.sends,0);
});
test('storage faults, changed physical session, foreign activity and unknown custody block new sends',async()=>{
  const storage=fixture({failSave:true});await assert.rejects(storage.controller.dispatch(identity),{code:'outcome_unknown'});assert.equal(storage.sends,0);await assert.rejects(storage.controller.dispatch(identity));
  const changed=fixture();changed.raw.sessionId='replacement';await assert.rejects(changed.controller.dispatch(identity));assert.equal(changed.sends,0);
  const foreign=fixture();foreign.raw.sessionInfo={activeLeafEntryId:null,hasActiveRun:true,activeRunIds:['foreign-run']};await assert.rejects(foreign.controller.dispatch(identity),{code:'busy'});assert.equal(foreign.sends,0);
  const f=fixture({loseResponse:true});await assert.rejects(f.controller.dispatch(identity));await assert.rejects(f.controller.dispatch({requestId:'00000000-0000-4000-8000-000000000003',dispatchId:'00000000-0000-4000-8000-000000000004'}),{code:'busy'});assert.equal(f.sends,1);
});
test('missing status is not admission; active IDs establish acceptance, exact canonical key establishes commit',async()=>{
  const f=fixture({loseResponse:true});assert.equal((await f.controller.status(identity)).state,'unknown');assert.equal(f.saved.length,0);
  await assert.rejects(f.controller.dispatch(identity));const owned=f.saved[0].runId;
  f.raw.sessionInfo={activeLeafEntryId:null,hasActiveRun:true,activeRunIds:[owned]};assert.equal((await f.controller.status(identity)).state,'accepted');
  f.raw.messages=[{role:'user',__openclaw:{id:'event-fixture',idempotencyKey:`${owned}:user`}}];assert.equal((await f.controller.status(identity)).state,'committed');
});
test('UDS credential, fixed JSON operations, size/schema bounds and sanitized errors',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'pcc-planner-')),socket=join(directory,'planner.sock'),credential='fictional-planner-credential-000000000000';
  const f=fixture(),server=createDispatchServer({controller:f.controller,credential});await new Promise(resolve=>server.listen(socket,resolve));
  const call=(path,body=identity,token=credential,method='POST')=>new Promise((resolve,reject)=>{const req=request({socketPath:socket,path,method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.end(JSON.stringify(body));});
  try {
    assert.equal((await call('/dispatch',identity,'wrong')).status,401);
    for(const path of ['/rpc','/config','/dispatch?agentId=foreign','/cancel'])assert.equal((await call(path)).status,404);
    assert.equal((await call('/dispatch',identity,credential,'GET')).status,404);
    assert.equal((await call('/dispatch',{...identity,prompt:'foreign'})).status,400);
    assert.equal((await call('/dispatch',{...identity,extra:'🙂'.repeat(500)})).status,400);
    assert.equal((await call('/status')).status,200);assert.equal(f.sends,0);
    assert.equal((await call('/dispatch')).status,200);assert.equal(f.sends,1);
  } finally {await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
