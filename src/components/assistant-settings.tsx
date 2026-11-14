"use client";

import { useEffect, useState, type FormEvent } from "react";
import { assistantDomains, planningDomains, type AssistantDomain } from "@/domain/assistant-access";

type Grant = { id: string; label: string; domains: AssistantDomain[]; expiresAt: string; revokedAt: string | null; lastUsedAt: string | null };

export function AssistantSettings() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [domains, setDomains] = useState<AssistantDomain[]>(["library", ...planningDomains]);
  const [label, setLabel] = useState("Personal assistant");
  const [days, setDays] = useState(30);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const response = await fetch("/api/assistant-grants", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load assistant connections.");
    const body = await response.json() as { grants: Grant[] };
    setGrants(body.grants);
  }
  useEffect(() => {
    let active = true;
    void fetch("/api/assistant-grants", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(); return await response.json() as { grants: Grant[] }; })
      .then((body) => { if (active) setGrants(body.grants); })
      .catch(() => { if (active) setError("Could not load assistant connections."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function toggle(domain: AssistantDomain) {
    setDomains((current) => {
      if (current.includes(domain)) {
        return current.filter((name) => name !== domain && !(planningDomains.includes(domain) && name === "rhythm"));
      }
      return [...new Set([...current, domain, ...(domain === "rhythm" ? planningDomains : [])])];
    });
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice(""); setToken("");
    try {
      const response = await fetch("/api/assistant-grants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, domains, days }) });
      if (!response.ok) throw new Error("Could not create this connection. Check the selected spaces or revoke an unused connection.");
      const body = await response.json() as { token: string };
      setToken(body.token);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection unavailable."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    if (!window.confirm("Revoke this assistant connection? Its saved token will stop working.")) return;
    setBusy(true); setError(""); setToken("");
    try {
      const response = await fetch("/api/assistant-grants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("Could not revoke this connection.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4 p-4">
    <p className="text-sm text-slate-500">Read-only access to selected spaces. Keychain is never included. Your assistant’s model provider may receive the records it retrieves.</p>
    {loading ? <p role="status">Loading connections…</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {notice ? <p role="status" className="text-sm">{notice}</p> : null}
    <form onSubmit={create} className="space-y-3">
      <label className="block text-sm">Connection name<input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} required className="input mt-1 block w-full" /></label>
      <fieldset><legend className="text-sm font-medium">Allowed spaces</legend><div className="grid grid-cols-2 gap-2 mt-2">
        {assistantDomains.map((domain) => <label key={domain} className="flex items-center gap-2 min-h-11 text-sm capitalize"><input type="checkbox" checked={domains.includes(domain)} onChange={() => toggle(domain)} />{domain === "rhythm" ? "Weekly Rhythm" : domain}</label>)}
      </div></fieldset>
      <label className="block text-sm">Expires after<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="input ml-2"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
      <button type="submit" disabled={busy || loading || !domains.length} className="rounded-xl bg-slate-950 px-4 py-3 text-sm text-white disabled:opacity-50">Create read-only connection</button>
    </form>
    {token ? <div className="space-y-2 rounded-xl border p-3">
      <p className="text-sm">Save this token now; it will not be shown again. Use a trusted secret-entry field, not an assistant chat message.</p>
      <input type="password" readOnly value={token} aria-label="New assistant connection token" autoComplete="off" className="input w-full" />
      <button type="button" className="min-h-11 text-sm underline" onClick={() => { void navigator.clipboard.writeText(token).then(() => setNotice("Token copied. Store it in the connector’s trusted credential field."), () => setError("Clipboard unavailable. Select the token field to copy it securely.")); }}>Copy token</button>
      <button type="button" className="ml-4 min-h-11 text-sm underline" onClick={() => setToken("")}>Dismiss token</button>
    </div> : null}
    <ul className="divide-y">{grants.map((grant) => <li key={grant.id} className="py-3 text-sm">
      <p className="font-medium">{grant.label}</p><p className="text-slate-500">{grant.domains.join(", ")} · Expires {new Date(grant.expiresAt).toLocaleDateString()}</p>
      <p className="text-slate-500">{grant.lastUsedAt ? `Last used ${new Date(grant.lastUsedAt).toLocaleDateString()}` : "Not used yet"}</p>
      {grant.revokedAt ? <p>Revoked</p> : <button type="button" disabled={busy} onClick={() => { void revoke(grant.id); }} className="min-h-11 text-red-700 underline disabled:opacity-50">Revoke</button>}
    </li>)}</ul>
  </div>;
}
