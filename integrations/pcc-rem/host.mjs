// Host-only entrypoint. No default identity store, Gateway URL, pairing or inference fallback.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync, lstatSync, unlinkSync, chmodSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { RemController, AdapterError } from './controller.mjs';
import { SUPPORTED_OPENCLAW } from './input-policy.mjs';
export function privateJson(path) {
  if (!isAbsolute(path)) throw new Error('private storage required');
  const stat=lstatSync(path); const parent=lstatSync(dirname(path));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid!==process.getuid() || (stat.mode&0o077)!==0 || stat.size>2097152 || !parent.isDirectory() || parent.uid!==process.getuid() || (parent.mode&0o077)!==0) throw new Error('private storage required');
  return JSON.parse(readFileSync(path,'utf8'));
}
export function atomicJson(path,value) {
  const temp=`${path}.new`; const fd=openSync(temp,'wx',0o600);
  try { writeFileSync(fd,JSON.stringify(value));fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp,path);const dir=openSync(dirname(path),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
}
const codes=new Set(['not_available','busy','invalid_input','rate_limited','stale_view','outcome_unknown']);
const statuses={busy:409,invalid_input:400,rate_limited:429,stale_view:409,outcome_unknown:409,not_available:503};
export function createAdapterServer({controller,credential}) {
  if(typeof credential!=='string'||credential.length<32||credential.length>256||/[\r\n]/.test(credential))throw new Error('credential required');
  let connections=0;
  const server=createServer({maxHeaderSize:8192,requestTimeout:10000,headersTimeout:5000},async(req,res)=> {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');
    const reply=(status,body)=>{if(!res.destroyed){res.writeHead(status);res.end(JSON.stringify(body));}};
    const expected=Buffer.from(`Bearer ${credential}`), actual=Buffer.from(req.headers.authorization??'');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply(401,{error:'not_authorized'});
    const operation=req.method==='GET'&&req.url==='/history'?'history':req.method==='POST'&&req.url==='/send'?'send':req.method==='POST'&&req.url==='/cancel'?'cancel':null;
    if(!operation)return reply(404,{error:'not_available'});
    if(connections>=8)return reply(429,{error:'rate_limited'});connections++;
    try {
      let body; if(operation!=='history') {
        if(req.headers['content-type']!=='application/json')throw new AdapterError('invalid_input');
        const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>32768){req.destroy();throw new AdapterError('invalid_input');}chunks.push(chunk);}
        try {body=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{throw new AdapterError('invalid_input');}
      }
      reply(200,await controller[operation](body));
    }catch(error){const code=codes.has(error.code)?error.code:'not_available';reply(statuses[code],{error:code});}
    finally{connections--;}
  });
  server.maxConnections=16;server.keepAliveTimeout=1000;return server;
}
export async function startHost(configPath) {
  const config=privateJson(configPath);
  if(config.enabled!==true)throw new Error('adapter disabled');
  const url=new URL(config.gatewayUrl);
  if(url.protocol!=='ws:'||!['127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('literal loopback Gateway required');
  if(!isAbsolute(config.openclawPackage)||!isAbsolute(config.socketPath)||!isAbsolute(config.ledgerPath)||!isAbsolute(config.devicePath))throw new Error('explicit paths required');
  const require=createRequire(config.openclawPackage);
  const pkg=require(config.openclawPackage);if(pkg.name!=='openclaw'||pkg.version!==SUPPORTED_OPENCLAW)throw new Error('unsupported SDK version');
  const {GatewayClient}=await import(pathToFileURL(require.resolve('openclaw/plugin-sdk/gateway-runtime')).href);
  let device=privateJson(config.devicePath);const stored=privateJson(config.ledgerPath);
  if(stored.bindingId!==config.binding.id||!Array.isArray(stored.rows))throw new Error('ledger binding mismatch');
  if(!device.identity?.privateKeyPem||!device.identity?.publicKeyPem||!device.identity?.deviceId||typeof device.token!=='string'||device.token.length<16)throw new Error('provisioned dedicated device required');
  const lockPath=join(dirname(config.ledgerPath),'writer.lock');const lock=openSync(lockPath,'wx',0o600);writeFileSync(lock,String(process.pid));
  let client,controller,server;
  const allowed=['operator.read','operator.write'];
  const verifyScopes=scopes=>Array.isArray(scopes)&&scopes.length===2&&allowed.every(s=>scopes.includes(s));
  try {
    controller=new RemController({binding:config.binding,ledger:stored.rows,clockFloor:stored.clockFloor??0,rpc:(method,params)=>client.request(method,params),saveLedger:(rows,clockFloor)=>atomicJson(config.ledgerPath,{bindingId:config.binding.id,rows,clockFloor})});
    client=new GatewayClient({url:config.gatewayUrl,role:'operator',scopes:allowed,minProtocol:4,maxProtocol:4,deviceIdentity:device.identity,deviceToken:device.token,caps:['chat-only-assistant-text'],requestTimeoutMs:5000,
      hostDeps:{loadOrCreateDeviceIdentity:()=>{throw new Error('default identity forbidden');},loadDeviceAuthToken:()=>({token:device.token,scopes:allowed}),
        storeDeviceAuthToken:p=>{p.assertCurrent?.();if(p.deviceId!==device.identity.deviceId||p.role!=='operator'||!verifyScopes(p.scopes))throw new Error('unexpected credential authority');device={identity:device.identity,token:p.token};atomicJson(config.devicePath,device);},
        clearDeviceAuthToken:()=>{device={identity:device.identity,token:null};atomicJson(config.devicePath,device);},beforeConnect:()=>{},registerGatewayLoopbackBypass:()=>undefined,logDebug:()=>{},logError:()=>{}},
      onHelloOk:hello=>{
        if(hello.protocol!==4||hello.server?.version!==SUPPORTED_OPENCLAW||hello.auth?.role!=='operator'||!verifyScopes(hello.auth?.scopes)||!['sessions.messages.subscribe','chat.history','chat.send','chat.abort'].every(m=>hello.features?.methods?.includes(m))){controller.disconnect();void client.stopAndWait({timeoutMs:1000});return;}
        void controller.connect().catch(()=>{});
      },onClose:()=>controller.disconnect(),onGap:()=>controller.disconnect(),onConnectError:()=>controller.disconnect(),onReconnectPaused:()=>controller.disconnect(),
      // Canonical history including the owned in-flight snapshot is the sole text projection.
      onEvent:()=>{},
    });
    server=createAdapterServer({controller,credential:config.credential});
    // Never unlink an unknown inode. Existing socket requires operator recovery/verification.
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.socketPath,resolve);});chmodSync(config.socketPath,0o660);client.start();
    const close=async()=>{await new Promise(resolve=>server.close(resolve));await client.stopAndWait({timeoutMs:5000});closeSync(lock);unlinkSync(lockPath);};
    return {controller,server,close};
  }catch(error){if(client)await client.stopAndWait({timeoutMs:1000});if(server?.listening)await new Promise(resolve=>server.close(resolve));closeSync(lock);unlinkSync(lockPath);throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.env.PCC_REM_HOST_CONFIG){console.error('PCC Rem adapter disabled: explicit private configuration required.');process.exitCode=1;}
  else try{const host=await startHost(process.env.PCC_REM_HOST_CONFIG);let stopping=false;const stop=()=>{if(!stopping){stopping=true;void host.close().then(()=>{process.exitCode=0;},()=>{process.exitCode=1;});}};process.on('SIGTERM',stop);process.on('SIGINT',stop);}catch{console.error('PCC Rem adapter unavailable; check private provisioning and version compatibility.');process.exitCode=1;}
}
