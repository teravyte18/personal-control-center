import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateKeyPairSync,createHash } from 'node:crypto';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { startHost } from './host.mjs';
const packagePath=process.env.PCC_REM_TEST_OPENCLAW_PACKAGE;
test('host refuses an OpenClaw package outside the verified exact pin',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'pcc-rem-version-'));
  try {
    const packageFile=join(dir,'openclaw-package.json'),configPath=join(dir,'config.json');
    await writeFile(packageFile,JSON.stringify({name:'openclaw',version:'2026.10.9'}),{mode:0o600});
    await writeFile(configPath,JSON.stringify({enabled:true,binding:{id:'fictional_binding_0001',agentId:'fixture',sessionKey:'agent:fixture:pcc-fictional'},openclawPackage:packageFile,gatewayUrl:'ws://127.0.0.1:18789/',devicePath:join(dir,'device.json'),ledgerPath:join(dir,'ledger.json'),socketPath:join(dir,'adapter.sock'),credential:'fictional-credential-0000000000000000000'}),{mode:0o600});
    await assert.rejects(startHost(configPath),/unsupported SDK version/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('host uses official version-pinned client, dedicated rotated storage and read/write-only fixture handshake',{skip:!packagePath},async()=>{
  const require=createRequire(packagePath);const {WebSocketServer}=require('ws');const wss=new WebSocketServer({host:'127.0.0.1',port:0});await once(wss,'listening');
  const dir=await mkdtemp(join(tmpdir(),'pcc-rem-host-'));const key=generateKeyPairSync('ed25519');const publicKeyPem=key.publicKey.export({type:'spki',format:'pem'});const identity={deviceId:createHash('sha256').update(key.publicKey.export({type:'spki',format:'der'}).subarray(-32)).digest('hex'),publicKeyPem,privateKeyPem:key.privateKey.export({type:'pkcs8',format:'pem'})};
  const binding={id:'fictional_binding_0001',agentId:'fixture',sessionKey:'agent:fixture:pcc-fictional'};const frames=[],failures=[];let gatewaySocket;
  wss.on('connection',socket=>{gatewaySocket=socket;socket.send(JSON.stringify({type:'event',event:'connect.challenge',payload:{nonce:'fictional',ts:Date.now()}}));socket.on('message',raw=>{try{const frame=JSON.parse(raw);frames.push(frame);const p=frame.params;let payload;
    if(frame.method==='connect'){assert.deepEqual(p.scopes,['operator.read','operator.write']);assert.equal(p.auth.deviceToken,'fictional-device-token');payload={type:'hello-ok',protocol:4,server:{version:'2026.11.3',connId:'fictional'},features:{methods:['sessions.messages.subscribe','chat.history','chat.send','chat.abort'],events:['chat']},snapshot:{},auth:{role:'operator',scopes:['operator.read','operator.write'],deviceToken:'fictional-rotated-device-token'},policy:{maxPayload:1048576,tickIntervalMs:30000}};}
    else if(frame.method==='sessions.messages.subscribe'){assert.equal(p.key,binding.sessionKey);payload={key:binding.sessionKey,agentId:binding.agentId};}
    else if(frame.method==='chat.history'){assert.equal(p.sessionKey,binding.sessionKey);payload={sessionKey:binding.sessionKey,sessionId:'physical-fixture',messages:[],sessionInfo:{hasActiveRun:false,activeRunIds:[],activeLeafEntryId:null}};}
    else throw new Error('unexpected RPC');
    socket.send(JSON.stringify({type:'res',id:frame.id,ok:true,payload}));
  }catch(error){failures.push(error);socket.close();}});});
  let host;
  try {
    const devicePath=join(dir,'device.json'),ledgerPath=join(dir,'ledger.json'),configPath=join(dir,'config.json');
    for(const [path,data] of [[devicePath,{identity,token:'fictional-device-token'}],[ledgerPath,{bindingId:binding.id,rows:[]}],[configPath,{enabled:true,binding,openclawPackage:packagePath,gatewayUrl:`ws://127.0.0.1:${wss.address().port}`,devicePath,ledgerPath,socketPath:join(dir,'adapter.sock'),credential:'fictional-credential-0000000000000000000'}]])await writeFile(path,JSON.stringify(data),{mode:0o600});
    host=await startHost(configPath);
    for(let i=0;i<100&&host.controller.snapshot().state!=='ready';i++)await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(host.controller.snapshot().state,'ready');assert.equal(failures.length,0,failures[0]?.message);assert.equal(frames[1].method,'sessions.messages.subscribe');assert.equal(JSON.parse(await readFile(devicePath,'utf8')).token,'fictional-rotated-device-token');
    const events=[];host.controller.onGatewayEvent=event=>events.push(event);
    gatewaySocket.send(JSON.stringify({type:'event',event:'chat',seq:1,payload:{sessionKey:binding.sessionKey,agentId:binding.agentId,runId:'fictional-run',state:'final'}}));
    for(let i=0;i<100&&!events.length;i++)await new Promise(resolve=>setTimeout(resolve,5));
    assert.deepEqual(events,[{type:'event',event:'chat',seq:1,payload:{sessionKey:binding.sessionKey,agentId:binding.agentId,runId:'fictional-run',state:'final'}}]);
    await assert.rejects(startHost(configPath)); // Same writer lock cannot be adopted.
  }finally{if(host)await host.close();for(const socket of wss.clients)socket.terminate();await new Promise(resolve=>wss.close(resolve));await rm(dir,{recursive:true,force:true});}
});
