import test from 'node:test';
import assert from 'node:assert/strict';
import { newRemSubmissionId } from '../../src/domain/rem-chat.ts';
import { RemController } from './controller.mjs';
import { admitText, ABORT_TRIGGERS } from './input-policy.mjs';
const binding={id:'fictional_binding_0001',agentId:'fixture',sessionKey:'agent:fixture:pcc-fictional'};
function fixture({ledger=[],loseAck=false,saveFails=false,clockFloor=0}={}) {
  const frames=[],active=[],receipts=[];let physical='fictional-physical-1',leaf=null,rows=[],snapshotMessages=[];
  const rpc=async(method,p)=> {
    frames.push({method,p});
    if(method==='sessions.messages.subscribe')return {key:binding.sessionKey,agentId:binding.agentId};
    assert.equal(p.sessionKey,binding.sessionKey);assert.equal(p.agentId,binding.agentId);
    if(method==='chat.history')return {sessionKey:binding.sessionKey,sessionId:physical,messages:snapshotMessages,deltaCursor:'fictional-cursor',sessionInfo:{hasActiveRun:active.length>0,activeRunIds:[...active],activeLeafEntryId:leaf},inputReceipts:receipts};
    if(method==='chat.send'){active.push(p.idempotencyKey);if(loseAck)throw new Error('fictional private provider error');return {runId:p.idempotencyKey,status:'started'};}
    if(method==='chat.abort'){return {ok:true,aborted:true,runIds:[p.runId]};}
    throw new Error('unexpected method');
  };
  const controller=new RemController({binding,rpc,ledger,clockFloor,saveLedger:async value=>{if(saveFails)throw new Error('fictional storage failure');rows=structuredClone(value);}});
  return {controller,frames,active,receipts,get rows(){return rows;},setPhysical:value=>{physical=value;},setLeaf:value=>{leaf=value;},setMessages:value=>{snapshotMessages=value;}};
}
const body=(c,text='A fictional question')=>({submissionId:newRemSubmissionId(),text,revision:c.snapshot().revision});
test('command-free guard rejects all pinned abort forms, aliases, inline directives, bang and hidden controls',()=>{
  for(const trigger of ABORT_TRIGGERS)assert.equal(admitText(trigger.toUpperCase()+'...'),false,trigger);
  for(const input of ['/model a','Please answer /model a','prefix /custom_alias value','! ls','hello !ls','ok\u200b/model','a／model','stop\u0000','a\\b','folder/file','https://example.test/\n/model'])assert.equal(admitText(input),false,input);
  for(const input of ['A fictional question','See https://example.test/path?q=one','What is next?','A multiline\nquestion'])assert.equal(admitText(input),true,input);
  assert.equal(admitText('🙂'.repeat(8001)),false);
});
test('exact fixed subscribe precedes history and guarded send; duplicate no second turn; payload conflict rejected',async()=>{
  const f=fixture();await f.controller.connect();const input=body(f.controller);const first=await f.controller.send(input);assert.equal(first.custody,'accepted');
  assert.deepEqual(await f.controller.send(input),first);assert.equal(f.frames.filter(f=>f.method==='chat.send').length,1);
  assert.equal(f.frames[0].method,'sessions.messages.subscribe');
  const sent=f.frames.find(f=>f.method==='chat.send').p;assert.deepEqual(Object.keys(sent).sort(),['agentId','expectedLeafEntryId','idempotencyKey','message','sessionId','sessionKey']);assert.equal(sent.expectedLeafEntryId,null);
  await assert.rejects(f.controller.send({...input,text:'Different'}),{code:'invalid_input'});
  await assert.rejects(f.controller.send(body(f.controller)),{code:'busy'});
});
test('lost ACK never resends, survives restart, reconciles exact active run and custody separately',async()=>{
  const f=fixture({loseAck:true});await f.controller.connect();const input=body(f.controller);
  await assert.rejects(f.controller.send(input),{code:'outcome_unknown'});assert.equal(f.rows[0].state,'unknown');
  await assert.rejects(f.controller.send(input),{code:'outcome_unknown'});assert.equal(f.frames.filter(f=>f.method==='chat.send').length,1);
  await f.controller.history();assert.equal(f.controller.snapshot().state,'busy');
  const restarted=fixture({ledger:structuredClone(f.rows)});await restarted.controller.connect();assert.equal(restarted.controller.snapshot().state,'outcome_unknown');
  await assert.rejects(restarted.controller.send(body(restarted.controller)),{code:'outcome_unknown'});
  f.receipts.push({runId:f.active[0],state:'consumed'});f.active.length=0;await f.controller.history();assert.equal(f.controller.snapshot().state,'ready');
  assert.equal((await f.controller.send(input)).custody,'committed');
});
test('durable preparation failure prevents inference; foreign activity blocks admission',async()=>{
  const f=fixture({saveFails:true});await f.controller.connect();await assert.rejects(f.controller.send(body(f.controller)),{code:'outcome_unknown'});assert.equal(f.frames.filter(f=>f.method==='chat.send').length,0);
  const g=fixture();g.active.push('foreign');await g.controller.connect();assert.equal(g.controller.snapshot().state,'outcome_unknown');
});
test('stale branch and changed physical generation cannot be silently retried',async()=>{
  const f=fixture();await f.controller.connect();const input=body(f.controller);f.setLeaf('changed');await assert.rejects(f.controller.send(input),{code:'stale_view'});assert.equal(f.frames.filter(f=>f.method==='chat.send').length,0);
  await f.controller.send(body(f.controller));f.setPhysical('other');await f.controller.history();assert.equal(f.controller.snapshot().state,'outcome_unknown');await assert.rejects(f.controller.cancel({runHandle:f.rows[0].handle}),{code:'invalid_input'});
});
test('exact cancel never retargets; disconnect does not cancel; reconnect subscribes then catches up',async()=>{
  const f=fixture();await f.controller.connect();const receipt=await f.controller.send(body(f.controller));
  await assert.rejects(f.controller.cancel({runHandle:'foreign'}),{code:'invalid_input'});await f.controller.cancel({runHandle:receipt.runHandle});
  assert.deepEqual(f.frames.find(f=>f.method==='chat.abort').p,{sessionKey:binding.sessionKey,agentId:binding.agentId,runId:f.rows[0].runId});
  f.controller.disconnect();assert.equal(f.frames.filter(f=>f.method==='chat.abort').length,1);await f.controller.connect();
  const reconnect=f.frames.slice(f.frames.findLastIndex(f=>f.method==='sessions.messages.subscribe'));assert.equal(reconnect[1].p.cursor,'fictional-cursor');
});
test('projection drops tools, reasoning, raw errors/internal entries and replaces by stable identity',async()=>{
  const f=fixture();f.setMessages([{role:'tool',content:'secret',__openclaw:{id:'tool'}},{role:'assistant',content:[{type:'thinking',text:'reasoning'},{type:'text',text:'Visible /home/example/private.txt'}],__openclaw:{id:'one'}},{role:'assistant',isError:true,content:'provider credential',__openclaw:{id:'error'}}]);
  await f.controller.connect();const snapshot=f.controller.snapshot();assert.equal(snapshot.messages.length,1);assert.equal(snapshot.messages[0].text,'Visible [private path]');const revision=snapshot.revision;await f.controller.history();assert.equal(f.controller.snapshot().revision,revision);
  f.setMessages([{role:'assistant',content:'Replaced',__openclaw:{id:'one'}}]);await f.controller.history();assert.equal(f.controller.snapshot().messages[0].id,snapshot.messages[0].id);assert.equal(f.controller.snapshot().messages.length,1);
});

test('expired/new stale UUIDv7 identities cannot replay after journal compaction',async()=>{
  const f=fixture();await f.controller.connect();
  await assert.rejects(f.controller.send({...body(f.controller),submissionId:newRemSubmissionId(Date.now()-6*60*1000)}),{code:'invalid_input'});
  await assert.rejects(f.controller.send({...body(f.controller),submissionId:newRemSubmissionId(Date.now()+60000)}),{code:'invalid_input'});
  await assert.rejects(f.controller.send({...body(f.controller),submissionId:newRemSubmissionId(Date.now()-25*60*60*1000)}),{code:'invalid_input'});
  assert.equal(f.frames.filter(f=>f.method==='chat.send').length,0);
});
test('persisted clock floor prevents fresh admission after wall clock rollback',async()=>{
  const f=fixture({clockFloor:Date.now()+25*60*60*1000});await f.controller.connect();
  await assert.rejects(f.controller.send(body(f.controller)),{code:'invalid_input'});
  assert.equal(f.frames.filter(frame=>frame.method==='chat.send').length,0);
});
test('exact consumed event identity maps canonical user message to submission (never text matching)',async()=>{
  const f=fixture();await f.controller.connect();const input=body(f.controller);await f.controller.send(input);
  f.receipts.push({runId:f.active[0],state:'consumed',consumedByEventId:'canonical-one'});f.active.length=0;
  f.setMessages([{role:'user',content:input.text,__openclaw:{id:'other'}},{role:'user',content:input.text,__openclaw:{id:'canonical-one'}}]);
  await f.controller.history();const snapshot=f.controller.snapshot();assert.equal(snapshot.messages[0].submissionId,undefined);assert.equal(snapshot.messages[1].submissionId,input.submissionId);
});
