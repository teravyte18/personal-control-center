import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { responses } from "./tools.mjs";

export function validateOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Configure a valid PCC origin."); }
  const loopback = ["127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash
    || !(url.protocol === "https:" || (loopback && url.protocol === "http:"))) throw new Error("PCC requires HTTPS or literal loopback HTTP, without credentials or a path.");
  return url.origin;
}

export async function loadCredential(env) {
  if (Boolean(env.PCC_ASSISTANT_TOKEN) === Boolean(env.PCC_ASSISTANT_TOKEN_FILE)) throw new Error("Configure exactly one credential source.");
  let token = env.PCC_ASSISTANT_TOKEN;
  if (env.PCC_ASSISTANT_TOKEN_FILE) {
    const handle = await open(env.PCC_ASSISTANT_TOKEN_FILE, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > 200 || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error("Credential file must be owner-only and owned by this process user.");
      token = (await handle.readFile("utf8")).trim();
    } finally { await handle.close(); }
  }
  if (!/^pcc_ro_[A-Za-z0-9_-]{43}$/.test(token ?? "")) throw new Error("Invalid PCC credential format.");
  return token;
}

export function createPccClient({ origin, token, fetchImpl = fetch, timeoutMs = 15000 }) {
  const base = validateOrigin(origin);
  if (!/^pcc_ro_[A-Za-z0-9_-]{43}$/.test(token ?? "")) throw new Error("Invalid PCC credential format.");
  return async function call(operation, args, signal) {
    if (!Object.hasOwn(responses, operation)) throw new Error("Unsupported PCC operation.");
    const url = new URL(`/api/assistant/${operation}`, base);
    url.searchParams.set("input", JSON.stringify(args));
    if (url.search.length > 15000) throw new Error("PCC input is too large.");
    const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
    let response;
    try { response = await fetchImpl(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, redirect: "error", cache: "no-store", signal: requestSignal }); }
    catch { throw new Error("PCC request failed, timed out, or was cancelled."); }
    if (!response.ok) {
      await response.body?.cancel();
      const messages = { 401: "PCC authentication required.", 403: "PCC access denied or credential expired/revoked.", 409: "PCC state or filters changed; restart pagination.", 413: "PCC result too large; narrow the query." };
      throw new Error(messages[response.status] ?? "PCC request was not accepted.");
    }
    if (!(response.headers.get("content-type") ?? "").startsWith("application/json")) { await response.body?.cancel(); throw new Error("PCC returned an invalid response."); }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("PCC returned an empty response.");
    const chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 250000) { await reader.cancel(); throw new Error(); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      return responses[operation].parse(parsed);
    } catch { throw new Error("PCC returned an invalid or oversized response."); }
    finally { reader.releaseLock(); }
  };
}
