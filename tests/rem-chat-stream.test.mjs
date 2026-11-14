import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { REM_LIMITS } from '../src/domain/rem-chat.ts';

// Exercise the real route source/Web Streams with controlled identity and adapter
// boundaries. Real cookie/DB HTTP authorization is covered by rem-chat-server.
test('SSE backpressure, idle lifetime, lease failure and pre-aborted cleanup',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'pcc-rem-stream-'));
  const saved={...REM_LIMITS};const insecure=process.env.PCC_ALLOW_INSECURE_USER_HEADER;delete process.env.PCC_ALLOW_INSECURE_USER_HEADER;
  try {
    const domain=pathToFileURL(resolve('src/domain/rem-chat.ts')).href;
    await writeFile(join(directory,'dependencies.mjs'),`
      import {RemError} from ${JSON.stringify(domain)};
      export class AuthenticationRequiredError extends Error{}
      export class AuthorizationError extends Error{}
      export let authorized=true;export let polls=0;
      export const config={enabled:true,ownerId:'fixture-owner',socketPath:'/fictional/socket',credential:'fictional'};
      export const setAuthorized=value=>{authorized=value;};
      export async function requireAuthenticatedUser(){if(!authorized)throw new AuthenticationRequiredError();return {id:config.ownerId};}
      export function requireOwner(){}
      export function remConfig(){return config;}
      export function requireRemOrigin(){}
      export async function readRemJson(){throw new RemError('invalid_input');}
      export async function remAdapter(){polls++;return {revision:'fictional_revision_0001',state:'ready',messages:[],truncated:false,activeRun:null};}
    `);
    let source=await readFile('src/server/rem-chat.ts','utf8');
    for(const name of ['@/server/auth','@/server/rem-chat-policy','@/server/rem-chat-adapter'])source=source.replaceAll(JSON.stringify(name),JSON.stringify('./dependencies.mjs')).replaceAll(`'${name}'`,"'./dependencies.mjs'");
    source=source.replaceAll("'@/domain/rem-chat'",JSON.stringify(domain));
    await writeFile(join(directory,'route.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
    const {remRoute}=await import(pathToFileURL(join(directory,'route.mjs')).href);const dependencies=await import(pathToFileURL(join(directory,'dependencies.mjs')).href);
    REM_LIMITS.streamMs=100;REM_LIMITS.leaseMs=20;
    const baseline=process.getActiveResourcesInfo().filter(item=>item==='Timeout').length;
    for(let i=0;i<8;i++){
      const controller=new AbortController();controller.abort();
      const response=await remRoute(new Request('http://fixture/api/rem/events',{signal:controller.signal}),'events');
      assert.equal(response.status,200);assert.equal((await response.body.getReader().read()).done,true);
    }
    assert.equal(process.getActiveResourcesInfo().filter(item=>item==='Timeout').length,baseline,'already-aborted requests allocate no timers or stream slots');
    const initialPolls=dependencies.polls;
    const response=await remRoute(new Request('http://fixture/api/rem/events'),'events');
    // No consumer: one queued chunk only, no continuing adapter polling.
    await new Promise(resolve=>setTimeout(resolve,50));assert.equal(dependencies.polls-initialPolls,1);
    await new Promise(resolve=>setTimeout(resolve,90));
    const reader=response.body.getReader();assert.equal((await reader.read()).done,false);assert.equal((await reader.read()).done,true,'lifetime closes even with no pulls');
    REM_LIMITS.streamMs=500;
    const revoked=await remRoute(new Request('http://fixture/api/rem/events'),'events');const revokedReader=revoked.body.getReader();await revokedReader.read();dependencies.setAuthorized(false);
    await new Promise(resolve=>setTimeout(resolve,50));assert.equal((await revokedReader.read()).done,true,'independent lease closes paused consumer');
    assert.equal(process.getActiveResourcesInfo().filter(item=>item==='Timeout').length,baseline,'all stream timers released');
  } finally {
    Object.assign(REM_LIMITS,saved);if(insecure===undefined)delete process.env.PCC_ALLOW_INSECURE_USER_HEADER;else process.env.PCC_ALLOW_INSECURE_USER_HEADER=insecure;
    await rm(directory,{recursive:true,force:true});
  }
});
