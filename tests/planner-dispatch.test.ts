import test from 'node:test';
import assert from 'node:assert/strict';
import { plannerDispatchConfig, requirePlannerDispatchOwner, readPlannerDispatchJson } from '../src/server/planner-dispatch-policy.ts';
const env={PCC_PLANNER_DISPATCH_ENABLED:'1',PCC_PLANNER_DISPATCH_OWNER_ID:'00000000-0000-4000-8000-000000000001',PCC_PUBLIC_URL:'https://example.test',PCC_PLANNER_DISPATCH_SOCKET_PATH:'/fictional/planner.sock',PCC_PLANNER_DISPATCH_CREDENTIAL:'fictional-planner-credential-0000000000'};
test('planner dispatch is independent, opt-in and rejects insecure or incomplete configuration',()=>{
  assert.equal(plannerDispatchConfig({PCC_REM_ENABLED:'1'}).enabled,false);
  for(const extra of [{PCC_ALLOW_INSECURE_USER_HEADER:'1'},{PCC_PUBLIC_URL:'http://example.test'},{PCC_PUBLIC_URL:'https://example.test/path'},{PCC_PLANNER_DISPATCH_OWNER_ID:''},{PCC_PLANNER_DISPATCH_SOCKET_PATH:'relative'},{PCC_PLANNER_DISPATCH_CREDENTIAL:'short'}])assert.throws(()=>plannerDispatchConfig({...env,...extra}));
});
test('only bound owner cookie-origin input may dispatch; no assistant grant, forwarding or selectors',()=>{
  const config=plannerDispatchConfig(env),owner={id:config.ownerId,role:'owner'};
  const req=(extra:Record<string,string>={},path='')=>new Request(`https://example.test/api/planner/requests${path}`,{headers:{origin:config.origin,'content-type':'application/json',...extra}});
  requirePlannerDispatchOwner(req(),owner,config);
  for(const user of [{...owner,role:'member'},{...owner,id:'foreign'}])assert.throws(()=>requirePlannerDispatchOwner(req(),user,config));
  for(const headers of [{authorization:'Bearer fictional'}, {'x-pcc-user-email':'fixture@example.test'},{origin:'https://foreign.test','x-forwarded-host':'example.test'},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'}])assert.throws(()=>requirePlannerDispatchOwner(req(headers),owner,config));
  assert.throws(()=>requirePlannerDispatchOwner(req({},'?agentId=foreign'),owner,config));
});
test('browser request reader bounds UTF-8 bytes and rejects malformed JSON/encoding',async()=>{
  const request=(body:BodyInit)=>new Request('https://example.test',{method:'POST',body});
  assert.deepEqual(await readPlannerDispatchJson(request('{"id":"fictional"}')),{id:'fictional'});
  for(const body of [new Uint8Array([0xff]),'{}x',JSON.stringify({text:'🙂'.repeat(1100)})])await assert.rejects(readPlannerDispatchJson(request(body)));
});
