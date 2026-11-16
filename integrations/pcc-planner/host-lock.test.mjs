import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startPlannerHost } from './host.mjs';

test('startup locks before mutable reads and cannot overwrite a prior writer finishing during startup', async () => {
  const dir=await mkdtemp(join(tmpdir(),'pcc-plan-lock-')),packageDir=join(dir,'node_modules','openclaw');
  const binding={id:'fictional_binding_0001',agentId:'fixture',sessionKey:'agent:fixture:pcc-planner-fictional_private_0001',sessionId:'physical-fixture'};
  const purpose='pcc-planner-dispatch',ledgerPath=join(dir,'ledger.json'),devicePath=join(dir,'device.json'),configPath=join(dir,'config.json'),lockPath=join(dir,'planner-writer.lock');
  const previous={requestId:'00000000-0000-4000-8000-000000000001',dispatchId:'00000000-0000-4000-8000-000000000002',state:'committed'};
  previous.runId=`pcc-plan-${createHash('sha256').update(`${binding.id}:${previous.dispatchId}`).digest('base64url')}`;
  const metadata={purpose,bindingId:binding.id};
  const originalOpen=fs.openSync;let interleaved=false,host;
  try {
    await mkdir(packageDir,{recursive:true,mode:0o700});
    await writeFile(join(packageDir,'package.json'),JSON.stringify({name:'openclaw',version:'2026.11.3',type:'module',exports:{'./plugin-sdk/gateway-runtime':'./runtime.mjs'}}));
    // Entirely fictional SDK lifecycle: no network, installed runtime, credentials or inference.
    await writeFile(join(packageDir,'runtime.mjs'),`
      export class GatewayClient {
        constructor(options){this.options=options;}
        start(){this.options.onHelloOk({protocol:4,server:{version:'2026.11.3'},auth:{role:'operator',scopes:['operator.read','operator.write']},features:{methods:['chat.history','chat.send']}});}
        async request(method,params){
          if(method==='chat.history')return {sessionKey:${JSON.stringify(binding.sessionKey)},sessionId:${JSON.stringify(binding.sessionId)},messages:[],sessionInfo:{activeLeafEntryId:null,activeRunIds:[],hasActiveRun:false}};
          if(method==='chat.send')return {runId:params.idempotencyKey,status:'accepted'};
          throw new Error('Unexpected method');
        }
        async stopAndWait(){}
      }
    `);
    await writeFile(ledgerPath,JSON.stringify({...metadata,rows:[]}),{mode:0o600});
    await writeFile(devicePath,JSON.stringify({...metadata,identity:{deviceId:'fictional-device',publicKeyPem:'fictional-public',privateKeyPem:'fictional-private'},token:'fictional-device-token-0001'}),{mode:0o600});
    await writeFile(configPath,JSON.stringify({enabled:true,purpose,binding,ledgerPath,devicePath,socketPath:join(dir,'planner.sock'),openclawPackage:join(packageDir,'package.json'),gatewayUrl:'ws://127.0.0.1:18789/',credential:'fictional-planner-credential-000000000000'}),{mode:0o600});
    // Deterministic OS-scheduling interleave: a prior writer commits immediately
    // before this startup acquires its lock. Reading before the lock would retain []
    // and the following dispatch would erase the prior writer's durable identity.
    fs.openSync=function(path,...args){
      if(path===lockPath && !interleaved){
        interleaved=true;const priorLock=originalOpen(path,'wx',0o600);
        try{fs.writeFileSync(ledgerPath,JSON.stringify({...metadata,rows:[previous]}));}
        finally{fs.closeSync(priorLock);fs.unlinkSync(path);}
      }
      return originalOpen(path,...args);
    };
    syncBuiltinESMExports();
    host=await startPlannerHost(configPath);
    fs.openSync=originalOpen;syncBuiltinESMExports();
    assert.equal(interleaved,true);assert.equal(host.controller.rows[0].dispatchId,previous.dispatchId);
    await host.controller.dispatch({requestId:'00000000-0000-4000-8000-000000000003',dispatchId:'00000000-0000-4000-8000-000000000004'});
    const stored=JSON.parse(await readFile(ledgerPath,'utf8'));
    assert.equal(stored.rows.length,2);assert.deepEqual(stored.rows[0],previous);
    await host.close();host=undefined;
    // Failed mutable-state validation after acquisition must release this writer's lock.
    await writeFile(devicePath,'{}',{mode:0o600});
    await assert.rejects(startPlannerHost(configPath),/Separate planner device/);
    assert.equal(fs.existsSync(lockPath),false);
  } finally {
    fs.openSync=originalOpen;syncBuiltinESMExports();if(host)await host.close();await rm(dir,{recursive:true,force:true});
  }
});
