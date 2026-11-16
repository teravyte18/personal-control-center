import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, cp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import postgres from 'postgres';
const databaseUrl=process.env.PCC_TEST_PLANNER_FICTIONAL_DATABASE_URL;
const enabled=Boolean(databaseUrl) && process.env.PCC_TEST_ALLOW_FICTIONAL_MUTATIONS==='1';
if(enabled){const url=new URL(databaseUrl);if(!['127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/planner_dispatch_test')throw new Error('Explicit loopback /planner_dispatch_test disposable database required.');}
test('owner-private dispatch persists custody before send, never resends unknown, and cancellation retains state', {skip:!enabled,timeout:180000},async()=>{
  const directory=await mkdtemp(join(tmpdir(),'pcc-plan-http-')),source=resolve('.'),sql=postgres(databaseUrl,{max:3});
  const owner='00000000-0000-4000-8000-000000000001',credential='fictional-planner-uds-credential-000000000000',socket=join(directory,'planner.sock');
  let sends=0,statuses=0,mode='accepted',release,admitted;
  const adapter=createServer(async(req,res)=>{
    assert.equal(req.headers.authorization,`Bearer ${credential}`);let raw='';for await(const chunk of req)raw+=chunk;
    const identity=JSON.parse(raw);assert.deepEqual(Object.keys(identity).sort(),['dispatchId','requestId']);
    const [row]=await sql`select dispatch_id,dispatch_state from planner_requests where user_id=${owner} and id=${identity.requestId}`;
    assert.equal(row.dispatch_id,identity.dispatchId);assert.ok(row.dispatch_state);
    if(req.url==='/dispatch'){
      sends++;assert.equal(row.dispatch_state,'unknown');
      if(mode==='lost'){req.socket.destroy();return;}
      if(mode==='race'){admitted?.(identity);await new Promise(resolve=>{release=resolve;});}
    }else {assert.equal(req.url,'/status');statuses++;}
    res.setHeader('content-type','application/json');res.end(JSON.stringify({...identity,state:mode==='accepted'?'accepted':mode==='lost'?'unknown':'committed'}));
  });
  let app,output='';
  try{
    execFileSync(process.execPath,['scripts/migrate.mjs'],{cwd:source,env:{...process.env,DATABASE_URL:databaseUrl},stdio:'pipe'});
    for(const file of ['src','public','next.config.ts','tsconfig.json','package.json','package-lock.json','next-env.d.ts','postcss.config.mjs'])await cp(join(source,file),join(directory,file),{recursive:true});
    await symlink(join(source,'node_modules'),join(directory,'node_modules'),'dir');await new Promise(resolve=>adapter.listen(socket,resolve));
    const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
    const base=`http://127.0.0.1:${port}`;
    app=spawn(process.execPath,[join(source,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:directory,env:{...process.env,DATABASE_URL:databaseUrl,PCC_ALLOW_INSECURE_USER_HEADER:'0',PCC_PUBLIC_URL:base,PCC_DEFAULT_USER_EMAIL:'owner@example.test',PCC_OWNER_BOOTSTRAP_PASSWORD:'fictional-bootstrap-password-123',PCC_COOKIE_SECURE:'0',PCC_PLANNER_DISPATCH_ENABLED:'1',PCC_PLANNER_DISPATCH_OWNER_ID:owner,PCC_PLANNER_DISPATCH_SOCKET_PATH:socket,PCC_PLANNER_DISPATCH_CREDENTIAL:credential,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
    app.stdout.on('data',chunk=>{output+=chunk;});app.stderr.on('data',chunk=>{output+=chunk;});
    const call=async(path,{cookie,body,headers={},method=body?'POST':'GET'}={})=>{
      const res=await fetch(base+path,{method,headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json',origin:base}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
      return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
    };
    let ready=false;for(let i=0;i<100;i++){try{if((await call('/api/health')).status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,300));}assert.ok(ready,output);
    const login=await call('/api/auth/login',{body:{email:'owner@example.test',password:'fictional-bootstrap-password-123'}});assert.equal(login.status,200);const cookie=login.cookie;
    async function session(role){const id=randomUUID(),token=randomUUID();await sql`insert into users(id,email,role,status) values(${id},${`${id}@example.test`},${role},'active')`;await sql`insert into auth_sessions(token_hash,user_id,expires_at) values(${createHash('sha256').update(token).digest('hex')},${id},${new Date(Date.now()+3600000)})`;return `pcc_session=${token}`;}
    for(const foreign of [undefined,await session('member'),await session('owner')])assert.equal((await call('/api/planner/requests/dispatch',{cookie:foreign,body:{id:randomUUID()}})).status,foreign?403:401);
    assert.equal((await call('/api/planner/requests/dispatch',{cookie,body:{id:randomUUID()},headers:{authorization:'Bearer fictional-grant'}})).status,403);
    assert.equal((await call('/api/planner/requests/dispatch',{cookie,body:{id:randomUUID(),agentId:'foreign'}})).status,403);
    assert.equal((await call('/api/planner/requests/dispatch',{cookie,body:{id:randomUUID()},headers:{origin:'https://foreign.example.test'}})).status,403);
    const monday=new Date();monday.setUTCHours(12,0,0,0);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7)+7);const weekStart=monday.toISOString().slice(0,10);
    const input={weekStart,intent:'replan',instructions:'Prioritise a fictional report.'};
    const queued=await call('/api/planner/requests',{cookie,body:input});assert.equal(queued.status,201);assert.equal(queued.data.request.dispatchState,'accepted');assert.equal(sends,1);
    mode='committed';const checked=await call('/api/planner/requests/dispatch',{cookie,body:{id:queued.data.request.id}});assert.equal(checked.status,200);assert.equal(checked.data.requests.find(r=>r.id===queued.data.request.id).dispatchState,'committed');assert.equal(sends,1);assert.equal(statuses,1);
    mode='lost';const lost=await call('/api/planner/requests',{cookie,body:input});assert.equal(lost.status,201);assert.equal(lost.data.request.dispatchState,'unknown');assert.equal(sends,2);
    for(let i=0;i<2;i++)await call('/api/planner/requests/dispatch',{cookie,body:{id:lost.data.request.id}});assert.equal(sends,2);
    mode='race';const admission=new Promise(resolve=>{admitted=resolve;});const pending=call('/api/planner/requests',{cookie,body:input});const racing=await admission;
    assert.equal((await call('/api/planner/requests',{cookie,method:'DELETE',body:{id:racing.requestId}})).status,200);release();const canceled=await pending;
    assert.ok(canceled.data.request.cancelledAt);assert.equal(canceled.data.request.dispatchState,'committed');
    const [retained]=await sql`select dispatch_id,cancelled_at from planner_requests where id=${racing.requestId}`;assert.equal(retained.dispatch_id,racing.dispatchId);assert.ok(retained.cancelled_at);
    const grant=await call('/api/assistant-grants',{cookie,body:{label:'Fictional planner',domains:['projects','tasks','rhythm'],plannerWrite:true}});assert.equal(grant.status,201);
    const auth={authorization:`Bearer ${grant.data.token}`};
    const exact=await call(`/api/assistant/planner?mode=requests&requestId=${racing.requestId}`,{headers:auth});assert.equal(exact.status,200);assert.deepEqual(exact.data.requests,[]);
    const current=await call('/api/personal-data',{cookie});
    const draft={revision:current.data.revision,requestId:racing.requestId,replaceFrom:weekStart,rationale:'Fictional draft.',removeSessionIds:[],sessions:[{date:weekStart,start:'14:00',minutes:60,title:'Fictional report',work:[],priorityReason:'Fictional priority.'}]};
    assert.equal((await call('/api/assistant/planner',{headers:auth,body:draft})).status,409);
    const [count]=await sql`select count(*)::int as count from planner_proposals where request_id=${racing.requestId}`;assert.equal(count.count,0);
  }finally{
    release?.();if(app){app.kill('SIGTERM');await new Promise(resolve=>{app.once('exit',resolve);setTimeout(()=>{app.kill('SIGKILL');resolve();},3000).unref();});}
    await new Promise(resolve=>adapter.close(resolve));await sql.end();await rm(directory,{recursive:true,force:true});
  }
});
