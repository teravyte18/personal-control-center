// Independent planner dispatch boundary. Never imports the PCC Rem chat bridge.
import { createRequire } from 'node:module';
import { openSync, closeSync, readFileSync, writeFileSync, fsyncSync, renameSync, lstatSync, unlinkSync, chmodSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { DispatchError, PlannerDispatchController, validateBinding } from './controller.mjs';
export const OPENCLAW_VERSION = '2026.11.3';
const purpose = 'pcc-planner-dispatch';
export function privateJson(path) {
  if (!isAbsolute(path)) throw new Error('Explicit private storage required.');
  const file = lstatSync(path), parent = lstatSync(dirname(path));
  if (!file.isFile() || file.isSymbolicLink() || file.uid !== process.getuid() || file.mode & 0o077 || file.size > 1048576
    || !parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== process.getuid() || parent.mode & 0o077) throw new Error('Private storage required.');
  return JSON.parse(readFileSync(path, 'utf8'));
}
export function atomicJson(path, value) {
  const temp = `${path}.new`, fd = openSync(temp, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(value)); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp, path); const directory = openSync(dirname(path), 'r');
  try { fsyncSync(directory); } finally { closeSync(directory); }
}
export function createDispatchServer({controller, credential}) {
  if (typeof credential !== 'string' || credential.length < 32 || credential.length > 256 || /[\r\n]/.test(credential)) throw new Error('Dedicated credential required.');
  let active = 0;
  const server = createServer({maxHeaderSize: 4096, requestTimeout: 6000, headersTimeout: 5000}, async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Content-Type', 'application/json');
    const reply = (status, value) => { if (!res.destroyed) { res.writeHead(status); res.end(JSON.stringify(value)); } };
    const expected = Buffer.from(`Bearer ${credential}`), actual = Buffer.from(req.headers.authorization ?? '');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return reply(401, {error: 'not_authorized'});
    const operation = req.method === 'POST' && ['/dispatch','/status'].includes(req.url) ? req.url.slice(1) : null;
    if (!operation) return reply(404, {error: 'not_available'});
    if (active >= 4) return reply(429, {error: 'rate_limited'});
    active++; const deadline = setTimeout(() => req.destroy(), 5000);
    try {
      if (req.headers['content-type'] !== 'application/json') throw new DispatchError('invalid_input');
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 1024) throw new DispatchError('invalid_input'); chunks.push(chunk); }
      clearTimeout(deadline);
      let body; try { body = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks))); } catch { throw new DispatchError('invalid_input'); }
      reply(200, await controller[operation](body));
    } catch (error) {
      const statuses = {invalid_input: 400, busy: 409, outcome_unknown: 409, rate_limited: 429};
      const code = Object.hasOwn(statuses, error?.code) ? error.code : 'not_available';
      reply(statuses[code] ?? 503, {error: code});
    } finally { clearTimeout(deadline); active--; }
  });
  server.maxConnections = 8; server.keepAliveTimeout = 1000; return server;
}
export async function startPlannerHost(configPath) {
  const config = privateJson(configPath);
  if (config.enabled !== true || config.purpose !== purpose) throw new Error('Planner dispatch disabled.');
  const binding = validateBinding(config.binding), url = new URL(config.gatewayUrl);
  if (url.protocol !== 'ws:' || !['127.0.0.1','[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Literal loopback Gateway required.');
  if (![config.socketPath,config.devicePath,config.ledgerPath,config.openclawPackage].every(path => typeof path === 'string' && isAbsolute(path))
    || new Set([configPath,config.devicePath,config.ledgerPath]).size !== 3) throw new Error('Separate explicit storage required.');
  const socketDir = lstatSync(dirname(config.socketPath));
  if (!socketDir.isDirectory() || socketDir.isSymbolicLink() || socketDir.uid !== process.getuid() || (socketDir.mode & 0o027) !== 0) throw new Error('Private app-accessible socket directory required.');
  const require = createRequire(config.openclawPackage), pkg = require(config.openclawPackage);
  if (pkg.name !== 'openclaw' || pkg.version !== OPENCLAW_VERSION) throw new Error('Unsupported SDK version.');
  const {GatewayClient} = await import(pathToFileURL(require.resolve('openclaw/plugin-sdk/gateway-runtime')).href);
  let device = privateJson(config.devicePath); const ledger = privateJson(config.ledgerPath);
  if (device.purpose !== purpose || device.bindingId !== binding.id || ledger.purpose !== purpose || ledger.bindingId !== binding.id
    || !device.identity?.privateKeyPem || !device.identity?.publicKeyPem || !device.identity?.deviceId || typeof device.token !== 'string' || device.token.length < 16) throw new Error('Separate planner device and custody journal required.');
  const lockPath = join(dirname(config.ledgerPath), 'planner-writer.lock'), lock = openSync(lockPath, 'wx', 0o600);
  writeFileSync(lock, String(process.pid));
  let client, server, ready = false, generation = 0;
  const scopes = ['operator.read','operator.write'];
  const validScopes = value => Array.isArray(value) && value.length === scopes.length && scopes.every(scope => value.includes(scope));
  const disconnect = () => { ready = false; generation++; };
  const rpc = async (method, params) => {
    if (!ready) throw new DispatchError('not_available');
    const current = generation, result = await client.request(method, params);
    if (!ready || generation !== current) throw new DispatchError('outcome_unknown');
    return result;
  };
  try {
    const controller = new PlannerDispatchController({binding, rows: ledger.rows,
      save: rows => atomicJson(config.ledgerPath, {purpose, bindingId: binding.id, rows}),
      snapshot: inputRunIds => rpc('chat.history', {agentId: binding.agentId, sessionKey: binding.sessionKey, limit: 20, maxBytes: 65536, maxChars: 100,
        ...(inputRunIds.length ? {inputRunIds} : {})}),
      send: ({requestId, runId, leaf}) => rpc('chat.send', {agentId: binding.agentId, sessionKey: binding.sessionKey, sessionId: binding.sessionId,
        expectedLeafEntryId: leaf, message: JSON.stringify({requestId}), idempotencyKey: runId}),
    });
    client = new GatewayClient({url: config.gatewayUrl, role: 'operator', scopes, minProtocol: 4, maxProtocol: 4,
      deviceIdentity: device.identity, deviceToken: device.token, requestTimeoutMs: 5000,
      hostDeps: {
        loadOrCreateDeviceIdentity: () => { throw new Error('Default identity forbidden.'); },
        loadDeviceAuthToken: () => ({token: device.token, scopes}),
        storeDeviceAuthToken: value => {
          value.assertCurrent?.();
          if (value.deviceId !== device.identity.deviceId || value.role !== 'operator' || !validScopes(value.scopes)) throw new Error('Unexpected authority.');
          device = {...device, token: value.token}; atomicJson(config.devicePath, device);
        },
        clearDeviceAuthToken: () => { device = {...device, token: null}; atomicJson(config.devicePath, device); },
        beforeConnect: () => {}, registerGatewayLoopbackBypass: () => undefined, logDebug: () => {}, logError: () => {},
      },
      onHelloOk: hello => {
        if (hello.protocol !== 4 || hello.server?.version !== OPENCLAW_VERSION || hello.auth?.role !== 'operator' || !validScopes(hello.auth?.scopes)
          || !['chat.history','chat.send'].every(method => hello.features?.methods?.includes(method))) { disconnect(); void client.stopAndWait({timeoutMs: 1000}); return; }
        ready = true; generation++;
      },
      onClose: disconnect, onGap: disconnect, onConnectError: disconnect, onReconnectPaused: disconnect,
    });
    server = createDispatchServer({controller, credential: config.credential});
    // Never replace/unlink an existing socket or silently create missing custody storage.
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.socketPath, resolve); });
    chmodSync(config.socketPath, 0o660); client.start();
    return {controller, server, close: async () => {
      disconnect(); await new Promise(resolve => server.close(resolve)); await client.stopAndWait({timeoutMs: 5000}); closeSync(lock); unlinkSync(lockPath);
    }};
  } catch (error) {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    if (client) await client.stopAndWait({timeoutMs: 1000}); closeSync(lock); unlinkSync(lockPath); throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.PCC_PLANNER_HOST_CONFIG) { console.error('Planner dispatch disabled: explicit private provisioning required.'); process.exitCode = 1; }
  else try {
    const host = await startPlannerHost(process.env.PCC_PLANNER_HOST_CONFIG); let stopping = false;
    const stop = () => { if (!stopping) { stopping = true; void host.close().then(() => { process.exitCode = 0; }, () => { process.exitCode = 1; }); } };
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
  } catch { console.error('Planner dispatch unavailable; verify private provisioning and compatibility.'); process.exitCode = 1; }
}
