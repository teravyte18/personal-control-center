import { request as httpRequest } from 'node:http';
import { RemError, REM_LIMITS } from '../domain/rem-chat.ts';
import type { RemConfig } from './rem-chat-policy.ts';
/** Fixed UDS operations only. Never a URL/RPC proxy and never browser-accessible. */
export function remAdapter(config: RemConfig, operation: 'history'|'send'|'cancel', body?: unknown, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve,reject)=> {
    const data=body===undefined?undefined:JSON.stringify(body);
    const req=httpRequest({socketPath:config.socketPath,path:`/${operation}`,method:operation==='history'?'GET':'POST',signal,headers:{Authorization:`Bearer ${config.credential}`,...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}},res=> {
      let length=0;const chunks:Buffer[]=[];
      res.on('data',(chunk:Buffer)=>{length+=chunk.length;if(length>REM_LIMITS.responseBytes){res.destroy();reject(new RemError('not_available'));}else chunks.push(chunk);});
      res.on('error',()=>reject(new RemError('not_available')));
      res.on('end',()=>{try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));if(res.statusCode!==200){const code=value?.error;if(['busy','invalid_input','rate_limited','stale_view','outcome_unknown'].includes(code))reject(new RemError(code));else reject(new RemError('not_available'));}else resolve(value);}catch{reject(new RemError('not_available'));}});
    });
    // Absolute deadline, not inactivity timeout: trickle responses cannot hold a request forever.
    const timer=setTimeout(()=>req.destroy(),7000);timer.unref();req.once('close',()=>clearTimeout(timer));req.once('error',()=>reject(new RemError('not_available')));req.end(data);
  });
}
