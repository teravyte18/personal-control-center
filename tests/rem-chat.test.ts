import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRemCancel, parseRemSend, parseRemSnapshot, remFictionalSnapshots } from '../src/domain/rem-chat.ts';
import { remConfig, requireRemOrigin, readRemJson } from '../src/server/rem-chat-policy.ts';
const env={PCC_REM_ENABLED:'1',PCC_REM_OWNER_ID:'00000000-0000-4000-8000-000000000001',PCC_PUBLIC_URL:'https://example.test',PCC_REM_SOCKET_PATH:'/fictional/adapter.sock',PCC_REM_ADAPTER_CREDENTIAL:'fictional-credential-0000000000000000'};
test('disabled by default; insecure identity, non-origin public URL and non-private socket rejected',()=>{
  assert.equal(remConfig({}).enabled,false);
  for(const change of [{PCC_ALLOW_INSECURE_USER_HEADER:'1'},{PCC_PUBLIC_URL:'https://example.test/path'},{PCC_PUBLIC_URL:'http://example.test'},{PCC_REM_SOCKET_PATH:'relative'}])assert.throws(()=>remConfig({...env,...change}));
});
test('same-origin JSON is mandatory for writes; untrusted forwarded host never establishes origin',()=>{
  const config=remConfig(env);
  requireRemOrigin(new Request('http://internal/api/rem/send',{headers:{origin:env.PCC_PUBLIC_URL,'content-type':'application/json'}}),config,true);
  for(const headers of [{},{origin:'https://evil.test','x-forwarded-host':'evil.test','content-type':'application/json'},{origin:env.PCC_PUBLIC_URL,'content-type':'text/plain'},{origin:env.PCC_PUBLIC_URL,'sec-fetch-site':'cross-site','content-type':'application/json'}])assert.throws(()=>requireRemOrigin(new Request('http://internal/api/rem/send',{headers}),config,true));
  assert.throws(()=>requireRemOrigin(new Request('http://internal/api/rem/history?sessionKey=foreign'),config));
});
test('strict shared schemas reject routing/identity/run injection and oversized multibyte bodies',async()=>{
  const input={submissionId:'00000000-0000-7000-8000-000000000001',text:'Fictional question',revision:'fictional_revision_0001'};
  assert.deepEqual(parseRemSend(input),input);
  for(const extra of ['sessionKey','agentId','model','userId','runId'])assert.throws(()=>parseRemSend({...input,[extra]:'foreign'}));
  assert.throws(()=>parseRemSend({...input,text:'🙂'.repeat(8001)}));assert.throws(()=>parseRemCancel({runHandle:'fictional_handle_0001',runId:'foreign'}));
  await assert.rejects(readRemJson(new Request('http://localhost',{method:'POST',body:JSON.stringify({text:'🙂'.repeat(9000)})})),{code:'invalid_input'});
  await assert.rejects(readRemJson(new Request('http://localhost',{method:'POST',body:new Uint8Array([0xff])})),{code:'invalid_input'});
  for(const fixture of remFictionalSnapshots)assert.deepEqual(parseRemSnapshot(fixture),fixture);
  assert.throws(()=>parseRemSnapshot({...remFictionalSnapshots[1],secret:'fictional'}));
});
test('body deadline rejects even valid partial JSON when the sender never finishes',async()=>{
  const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{}'));}});
  await assert.rejects(readRemJson(new Request('http://localhost',{method:'POST',body,duplex:'half'} as RequestInit)),{code:'invalid_input'});
});
