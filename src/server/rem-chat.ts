import { randomUUID } from 'node:crypto';
import { AuthenticationRequiredError, AuthorizationError, requireAuthenticatedUser, requireOwner } from '@/server/auth';
import { RemError, REM_LIMITS, parseRemCancel, parseRemSend, parseRemSnapshot, remExact, remObject, remOpaque } from '@/domain/rem-chat';
import { readRemJson, remConfig, requireRemOrigin, type RemConfig } from '@/server/rem-chat-policy';
import { remAdapter } from '@/server/rem-chat-adapter';
const headers = { 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' };
const statuses = { not_available:503,busy:409,invalid_input:400,rate_limited:429,stale_view:409,outcome_unknown:409,not_authenticated:401,not_authorized:403 };
function safeError(error: unknown) {
  const code = error instanceof RemError ? error.code : error instanceof AuthenticationRequiredError ? 'not_authenticated' : error instanceof AuthorizationError ? 'not_authorized' : 'not_available';
  return Response.json({error:code},{status:statuses[code],headers});
}
async function authorize(request: Request, write=false): Promise<RemConfig> {
  // Refuse test identities even in disabled mode; never provision a test account here.
  if(process.env.PCC_ALLOW_INSECURE_USER_HEADER==='1')throw new RemError('not_available');
  if(request.headers.has('authorization')||request.headers.has('x-pcc-user-email'))throw new RemError('not_authenticated');
  const user=await requireAuthenticatedUser(request);requireOwner(user);
  const config=remConfig();
  if(config.enabled && user.id!==config.ownerId)throw new RemError('not_authorized');
  requireRemOrigin(request,config,write);return config;
}
const disabled=()=>({revision:'disabled_feature_0001',state:'disabled',messages:[],truncated:false,activeRun:null});
let activeStreams=0;
export async function remRoute(request: Request, operation:'history'|'send'|'cancel'|'events') {
  try {
    const write=operation==='send'||operation==='cancel';const config=await authorize(request,write);
    if(!config.enabled){if(operation==='history')return Response.json(disabled(),{headers});throw new RemError('not_available');}
    if(operation==='history')return Response.json(parseRemSnapshot(await remAdapter(config,'history',undefined,request.signal)),{headers});
    if(operation==='send') {
      const body=parseRemSend(await readRemJson(request));const result=remObject(await remAdapter(config,'send',body,request.signal));
      remExact(result,['submissionId','runHandle','custody']);
      if(result.submissionId!==body.submissionId||!remOpaque(result.runHandle)||!['accepted','committed'].includes(String(result.custody)))throw new RemError('not_available');
      return Response.json(result,{headers});
    }
    if(operation==='cancel') {
      const result=remObject(await remAdapter(config,'cancel',parseRemCancel(await readRemJson(request)),request.signal));remExact(result,['state']);
      if(!['stopping','already-finished'].includes(String(result.state)))throw new RemError('not_available');
      return Response.json(result,{headers});
    }
    if(activeStreams>=4)throw new RemError('rate_limited');activeStreams++;
    const abort=new AbortController();const start=Date.now();let bytes=0;let last='';let closed=false;let timer:ReturnType<typeof setTimeout>|undefined;let wake:(()=>void)|undefined;let life:ReturnType<typeof setTimeout>|undefined;let leaseTimer:ReturnType<typeof setInterval>|undefined;let validating=false;
    const cleanup=()=>{if(closed)return;closed=true;activeStreams--;abort.abort();if(timer)clearTimeout(timer);if(life)clearTimeout(life);if(leaseTimer)clearInterval(leaseTimer);wake?.();request.signal.removeEventListener('abort',cleanup);};
    request.signal.addEventListener('abort',cleanup,{once:true});if(request.signal.aborted)cleanup();
    const encoder=new TextEncoder();
    const stream=new ReadableStream<Uint8Array>({
      start(controller) {
        if(closed){controller.close();return;}
        const finish=()=>{cleanup();try{controller.close();}catch{/* already closed */}};
        life=setTimeout(finish,REM_LIMITS.streamMs);
        leaseTimer=setInterval(()=>{if(closed||validating)return;validating=true;void authorize(request).then(fresh=>{if(!fresh.enabled||fresh.ownerId!==config.ownerId||fresh.socketPath!==config.socketPath||fresh.credential!==config.credential)finish();},finish).finally(()=>{validating=false;});},REM_LIMITS.leaseMs);
      },
      async pull(controller) {
        try {
          if(closed){try{controller.close();}catch{/* already closed */}return;}
          if(last){await new Promise<void>(resolve=>{wake=resolve;timer=setTimeout(resolve,1000);});wake=undefined;timer=undefined;}
          if(closed||Date.now()-start>=REM_LIMITS.streamMs){cleanup();try{controller.close();}catch{/* already closed */}return;}

          const snapshot=parseRemSnapshot(await remAdapter(config,'history',undefined,abort.signal));
          const chunk=encoder.encode(snapshot.revision===last ? ': keepalive\n\n' : `id: ${snapshot.revision}\nevent: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
          last=snapshot.revision;bytes+=chunk.length;
          if(bytes>1048576){controller.enqueue(encoder.encode(`event: reset\ndata: {"id":"${randomUUID()}"}\n\n`));cleanup();try{controller.close();}catch{/* already closed */}return;}
          if(!closed)controller.enqueue(chunk);else try{controller.close();}catch{/* already closed */}
        } catch {if(!closed){controller.enqueue(encoder.encode('event: error\ndata: {"error":"not_available"}\n\n'));cleanup();}try{controller.close();}catch{/* already closed */}}
      },cancel(){cleanup();},
    },{highWaterMark:1});
    return new Response(stream,{headers:{...headers,'Content-Type':'text/event-stream','X-Accel-Buffering':'no'}});
  }catch(error){return safeError(error);}
}
