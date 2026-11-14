import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, cp, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import postgres from 'postgres';

// Explicit disposable DB authorization only. This suite launches its own app and fictional UDS;
// it never addresses an existing PCC/Gateway server or uses real records/credentials.
const enabled=process.env.PCC_TEST_REM_FICTIONAL_DATABASE_URL && process.env.PCC_TEST_ALLOW_FICTIONAL_MUTATIONS==='1';
if(enabled){const database=new URL(process.env.PCC_TEST_REM_FICTIONAL_DATABASE_URL);if(!['127.0.0.1','localhost','[::1]'].includes(database.hostname)||database.pathname!=='/rem_chat_test')throw new Error('Rem HTTP fixtures require loopback /rem_chat_test disposable database');}
test('enabled Rem routes enforce real cookies, binding, schemas, stream caps and revocation', {skip:!enabled,timeout:180000},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'pcc-rem-http-'));const source=resolve('.');
  const sql=postgres(process.env.PCC_TEST_REM_FICTIONAL_DATABASE_URL,{max:2});
  const socket=join(directory,'adapter.sock');const credential='fictional-uds-credential-0000000000000000';
  const owner='00000000-0000-4000-8000-000000000001';
  let polls=0;const snapshot={revision:'fictional_revision_0001',state:'ready',messages:[{id:'fictional_message_0001',role:'assistant',text:'Fictional reply',status:'complete'}],truncated:false,activeRun:null};
  const adapter=createServer(async(req,res)=>{
    assert.equal(req.headers.authorization,`Bearer ${credential}`);polls++;
    let raw='';for await(const chunk of req)raw+=chunk;
    res.setHeader('content-type','application/json');
    if(req.url==='/history')res.end(JSON.stringify(snapshot));
    else if(req.url==='/send')res.end(JSON.stringify({submissionId:JSON.parse(raw).submissionId,runHandle:'fictional_run_handle_0001',custody:'accepted'}));
    else if(req.url==='/cancel')res.end(JSON.stringify({state:'stopping'}));
    else {res.statusCode=404;res.end('{}');}
  });
  let app;const streams=[];
  try {
    execFileSync(process.execPath,['scripts/migrate.mjs'],{cwd:source,env:{...process.env,DATABASE_URL:process.env.PCC_TEST_REM_FICTIONAL_DATABASE_URL},stdio:'pipe'});
    for(const file of ['src','public','next.config.ts','tsconfig.json','package.json','package-lock.json','next-env.d.ts','postcss.config.mjs'])await cp(join(source,file),join(directory,file),{recursive:true});
    await symlink(join(source,'node_modules'),join(directory,'node_modules'),'dir');
    await new Promise(resolve=>adapter.listen(socket,resolve));
    // Port zero is not supported by Next's CLI; reserve an unused loopback port first.
    const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
    const base=`http://127.0.0.1:${port}`;let output='';
    app=spawn(process.execPath,[join(source,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:directory,env:{...process.env,DATABASE_URL:process.env.PCC_TEST_REM_FICTIONAL_DATABASE_URL,PCC_ALLOW_INSECURE_USER_HEADER:'0',PCC_PUBLIC_URL:base,PCC_DEFAULT_USER_EMAIL:'owner@example.test',PCC_OWNER_BOOTSTRAP_PASSWORD:'fictional-bootstrap-password-123',PCC_COOKIE_SECURE:'0',PCC_REM_ENABLED:'1',PCC_REM_OWNER_ID:owner,PCC_REM_SOCKET_PATH:socket,PCC_REM_ADAPTER_CREDENTIAL:credential,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
    app.stdout.on('data',chunk=>{output+=chunk;});app.stderr.on('data',chunk=>{output+=chunk;});
    await writeFile(join(directory,'fixture-origin'),base);
    const request=(path,{cookie,body,headers={},method=body?'POST':'GET'}={})=>fetch(base+path,{method,headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json',origin:base}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    let ready=false;for(let i=0;i<100;i++){try{const r=await request('/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,300));}assert.ok(ready,output);
    const login=await request('/api/auth/login',{body:{email:'owner@example.test',password:'fictional-bootstrap-password-123'}});assert.equal(login.status,200,await login.clone().text());const cookie=login.headers.get('set-cookie').split(';')[0];
    const history=await request('/api/rem/history',{cookie});assert.equal(history.status,200);assert.deepEqual(await history.json(),snapshot);assert.match(history.headers.get('cache-control'),/private.*no-store/);
    const member=randomUUID(),otherOwner=randomUUID();
    await sql`insert into users (id,email,role,status) values (${member},${`member-${member}@example.test`},'member','active'),(${otherOwner},${`other-owner-${otherOwner}@example.test`},'owner','active')`;
    async function session(user,expired=false){const token=randomUUID();await sql`insert into auth_sessions (token_hash,user_id,expires_at) values (${createHash('sha256').update(token).digest('hex')},${user},${new Date(Date.now()+(expired?-60000:3600000))})`;return `pcc_session=${token}`;}
    const memberCookie=await session(member),otherCookie=await session(otherOwner),expiredCookie=await session(owner,true);
    for(const path of ['/api/rem/history','/api/rem/events','/api/rem/send','/api/rem/cancel']){
      const options=path.endsWith('/send')||path.endsWith('/cancel')?{body:{}}:{};
      for(const [identity,status] of [[undefined,401],[memberCookie,403],[otherCookie,403],[expiredCookie,401]])assert.equal((await request(path,{...options,cookie:identity})).status,status,path);
      assert.equal((await request(path,{...options,cookie,headers:{authorization:'Bearer fictional-assistant-grant'}})).status,401);
    }
    const send={submissionId:'00000000-0000-7000-8000-000000000001',text:'A fictional question',revision:snapshot.revision};
    assert.equal((await request('/api/rem/send',{cookie,body:send})).status,200);
    for(const body of [{...send,agentId:'foreign'},{...send,text:'🙂'.repeat(9000)}])assert.equal((await request('/api/rem/send',{cookie,body})).status,400);
    assert.equal((await request('/api/rem/send',{cookie,body:send,headers:{origin:'https://foreign.example.test'}})).status,403);
    assert.equal((await request('/api/rem/history?sessionKey=foreign',{cookie})).status,400);
    assert.equal((await request('/api/rem/events',{cookie,headers:{origin:'https://foreign.example.test'}})).status,403);
    for(let i=0;i<4;i++){const response=await request('/api/rem/events',{cookie});assert.equal(response.status,200);const reader=response.body.getReader();streams.push(reader);const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/event: snapshot/);}
    assert.equal((await request('/api/rem/events',{cookie})).status,429);
    await sql`delete from auth_sessions where token_hash = ${createHash('sha256').update(cookie.slice('pcc_session='.length)).digest('hex')}`;
    assert.equal((await request('/api/rem/history',{cookie})).status,401);
    const deadline=Date.now()+20000;
    for(const reader of streams){let done=false;while(Date.now()<deadline){const chunk=await reader.read();if(chunk.done){done=true;break;}}assert.ok(done,'revoked stream closes within lease');}
    assert.ok(polls>4);
    const revokedCookie=await session(member);await sql`update users set status='revoked' where id=${member}`;assert.equal((await request('/api/rem/history',{cookie:revokedCookie})).status,401);
  } finally {
    for(const reader of streams)await reader.cancel().catch(()=>{});
    if(app){app.kill('SIGTERM');await new Promise(resolve=>{app.once('exit',resolve);setTimeout(()=>{app.kill('SIGKILL');resolve();},3000).unref();});}
    await new Promise(resolve=>adapter.close(resolve));await sql.end();await rm(directory,{recursive:true,force:true});
  }
});
