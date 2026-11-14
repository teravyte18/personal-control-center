"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { newRemSubmissionId, parseRemSnapshot, type RemMessage, type RemSnapshot } from "@/domain/rem-chat";
import { isDefinitiveRemRejection, parseRemReceipt, reconcileRemIntent } from "@/lib/rem-chat-ui-state";

const safeErrors: Record<string, string> = {
  invalid_input: "That message can’t be sent as written. Try phrasing it without command-like syntax.",
  busy: "Rem is already working on a message.",
  stale_view: "The conversation changed. It has been refreshed; review the draft before sending again.",
  outcome_unknown: "The send outcome is not yet known. Your draft is kept; it won’t be sent again automatically.",
  rate_limited: "Please wait a moment before trying again.",
  not_available: "Talk to Rem is currently unavailable.",
  not_authenticated: "Your session has ended. Sign in again to continue.",
  not_authorized: "Talk to Rem is not enabled for this account.",
};

export function RemChat() {
  const [snapshot, setSnapshot] = useState<RemSnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Connecting to Rem…");
  const pending = useRef<{ id: string; text: string } | null>(null);
  const draftRef = useRef("");
  const authDenied = useRef(false);
  const sourceRef = useRef<EventSource | null>(null);
  const mounted = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  const denyAccess = useCallback((message: string) => {
    authDenied.current = true; sourceRef.current?.close(); sourceRef.current = null;
    setSnapshot(null); setConnected(false); setStatus("Sign-in or access is required"); setError(message);
  }, []);

  const replace = useCallback((value: unknown) => {
    if (authDenied.current) return;
    const next = parseRemSnapshot(value);
    setSnapshot(next); setConnected(true);
    setStatus(next.state === "ready" ? "Ready" : next.state === "busy" ? "Rem is responding" : next.state === "stopping" ? "Stopping response" : next.state === "outcome_unknown" ? "Send outcome unknown" : next.state === "disabled" ? "Talk to Rem is disabled" : next.state === "unavailable" ? "Rem is unavailable" : "Reconnecting…");
    const reconciled = reconcileRemIntent(next, pending.current, draftRef.current);
    if (reconciled.intent !== pending.current) { pending.current = reconciled.intent; setSending(false); setDraft(reconciled.draft); setError(""); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let retry = 1000; authDenied.current = false;
    const load = async () => {
      if (!alive || authDenied.current) return;
      try {
        const response = await fetch("/api/rem/history", { cache: "no-store" });
        if (!alive) return;
        if (!response.ok) { const code = response.status === 401 ? "not_authenticated" : response.status === 403 ? "not_authorized" : "not_available"; if (code === "not_authenticated" || code === "not_authorized") { denyAccess(safeErrors[code]); throw new Error(code); } throw new Error(code); }
        const initial = await response.json(); if (!alive || authDenied.current) return; replace(initial);
        const initialSnapshot = parseRemSnapshot(initial);
        if (initialSnapshot.state === "disabled") { setConnected(false); return; }
        source = new EventSource("/api/rem/events"); sourceRef.current = source;
        source.addEventListener("snapshot", event => { if (!alive || authDenied.current) return; try { replace(JSON.parse((event as MessageEvent).data)); } catch { setError("A conversation update could not be read. Reconnecting…"); } });
        source.addEventListener("reset", () => { if (!alive || authDenied.current) return; source?.close(); source = null; sourceRef.current = null; timer = setTimeout(load, 200); });
        source.addEventListener("error", event => {
          if (!alive || authDenied.current) return;
          const data = (event as MessageEvent).data;
          if (data) { try { const parsed = JSON.parse(data); setError(safeErrors[parsed.error] || "The connection reported an error."); if (["not_authenticated", "not_authorized"].includes(parsed.error)) denyAccess(safeErrors[parsed.error]); } catch { setError("The connection reported an error."); } }
        });
        source.onerror = () => { source?.close(); source = null; sourceRef.current = null; if (alive && !authDenied.current) { setConnected(false); setStatus("Reconnecting…"); timer = setTimeout(load, retry); retry = Math.min(retry * 2, 10000); } };
      } catch (cause) {
        const code = cause instanceof Error ? cause.message : "not_available";
        if (!alive) return;
        if (authDenied.current) { setSnapshot(null); setConnected(false); return; }
        setError(safeErrors[code] || "Could not connect to Rem. Your draft is kept."); setConnected(false); setStatus("Reconnecting…");
        if (alive && !authDenied.current) { timer = setTimeout(load, retry); retry = Math.min(retry * 2, 10000); }
      }
    };
    void load();
    return () => { alive = false; source?.close(); sourceRef.current = null; clearTimeout(timer); };
  }, [replace, denyAccess]);

  useEffect(() => {
    const node = listRef.current;
    if (node && nearBottom.current) node.scrollTop = node.scrollHeight;
  }, [snapshot?.messages]);

  const canSend = connected && snapshot?.state === "ready" && !!draft.trim() && !sending;
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!canSend || !snapshot || pending.current) return;
    const intent = { id: newRemSubmissionId(), text: draft }; pending.current = intent; setSending(true); setError("");
    try {
      const response = await fetch("/api/rem/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionId: intent.id, text: intent.text, revision: snapshot.revision }) });
      const body = await response.json().catch(() => null);
      if (!mounted.current) return;
      if (response.status === 401 || response.status === 403) { denyAccess(safeErrors[response.status === 401 ? "not_authenticated" : "not_authorized"]); return; }
      if (authDenied.current || pending.current?.id !== intent.id) return;
      if (!response.ok) { const code = body && typeof body === "object" ? (body as { error?: unknown }).error : undefined; setError(safeErrors[String(code)] || "The send outcome is uncertain. Your draft is kept; don’t resend yet."); if (isDefinitiveRemRejection(code)) { pending.current = null; setSending(false); } return; }
      const receipt = parseRemReceipt(body, intent.id);
      if (!receipt) { setError("The send outcome could not be confirmed. Your draft is kept; don’t resend yet."); return; }
      if (receipt.custody === "committed") { pending.current = null; setSending(false); setDraft(current => current === intent.text ? "" : current); }
      else { setError("Rem accepted the message; waiting for the conversation to confirm it. Don’t resend yet."); }
      setSnapshot(current => current ? { ...current, state: "busy" } : current);
    } catch { if (mounted.current && !authDenied.current && pending.current?.id === intent.id) setError("The connection ended before confirmation. Your draft is kept; it won’t be resent automatically."); }
  }
  async function stop() {
    if (!snapshot?.activeRun?.cancellable) return;
    setError(""); setSnapshot(current => current ? { ...current, state: "stopping" } : current);
    try {
      const response = await fetch("/api/rem/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runHandle: snapshot.activeRun.handle }) });
      if (response.status === 401 || response.status === 403) { if (mounted.current) denyAccess(safeErrors[response.status === 401 ? "not_authenticated" : "not_authorized"]); return; }
      if (!response.ok) { const body = await response.json().catch(() => ({})); if (!mounted.current || authDenied.current) return; setError(safeErrors[body.error] || "Couldn’t stop this response. The conversation will refresh."); if (["not_authenticated", "not_authorized"].includes(body.error)) denyAccess(safeErrors[body.error]); }
    } catch { if (mounted.current && !authDenied.current) setError("Couldn’t confirm the stop. The conversation will refresh."); }
  }

  return <div className="rem-chat" aria-label="Dedicated Rem conversation">
    <div className="rem-chat-note">A dedicated conversation with Rem. It is separate from your main chat history.</div>
    {snapshot?.truncated && <p className="rem-chat-meta">Showing the latest conversation messages.</p>}
    <div ref={listRef} className="rem-chat-messages" role="log" aria-label="Conversation" aria-live="polite" onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64; }}>
      {snapshot?.messages.map((message: RemMessage) => <article key={message.id} className={`rem-message rem-message-${message.role}`}><div className="rem-message-role">{message.role === "user" ? "You" : "Rem"}</div><div className="rem-message-text">{message.text}</div>{message.status !== "complete" && <div className="rem-chat-meta">{message.status === "streaming" ? "Responding…" : message.status === "pending" ? "Sending…" : message.status === "stopped" ? "Stopped" : "Not completed"}</div>}</article>)}
      {!snapshot?.messages.length && snapshot?.state === "ready" && <p className="rem-chat-empty">Start a conversation with Rem.</p>}
    </div>
    <p className="rem-chat-status" role="status" aria-live="polite">{status}</p>
    {error && <p className="rem-chat-error" role="alert">{error}</p>}
    <form className="rem-composer" onSubmit={send}>
      <label htmlFor="rem-draft">Message Rem</label>
      <textarea id="rem-draft" value={draft} onChange={event => { draftRef.current = event.target.value; setDraft(event.target.value); }} rows={3} maxLength={8000} placeholder="Write a message…" />
      <div className="rem-composer-actions"><span className="rem-chat-meta">Messages are not added to PCC records.</span>{snapshot?.activeRun?.cancellable ? <button type="button" className="rem-button rem-button-quiet" onClick={stop} disabled={snapshot.state === "stopping"}>Stop</button> : null}<button className="rem-button" disabled={!canSend}>Send</button></div>
    </form>
  </div>;
}
