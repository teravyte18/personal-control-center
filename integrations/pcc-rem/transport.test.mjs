import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,chmod,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createAdapterServer } from './host.mjs';
const credential='fictional-credential-0000000000000000000';
test('real UDS requires credential, exposes only fixed operations and sanitizes errors',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'pcc-rem-test-'));await chmod(dir,0o700);const socket=join(dir,'adapter.sock');
  const server=createAdapterServer({credential,controller:{history:async()=>({fixture:true}),send:async()=>{throw new Error('fictional SECRET /home/private');}}});
  await new Promise(resolve=>server.listen(socket,resolve));
  const call=(path,token=credential,method='GET',body)=>new Promise((resolve,reject)=>{const req=request({socketPath:socket,path,method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,body:data}));});req.on('error',reject);req.end(body);});
  try {
    assert.equal((await call('/history',null)).status,401);assert.equal((await call('/history','wrong')).status,401);assert.equal((await call('/history')).status,200);
    for(const path of ['/rpc','/history?sessionKey=foreign','/config'])assert.equal((await call(path)).status,404);
    const error=await call('/send',credential,'POST','{}');assert.equal(error.status,503);assert.equal(error.body,'{"error":"not_available"}');
  }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
