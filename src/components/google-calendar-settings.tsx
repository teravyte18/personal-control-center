"use client";

import { useEffect, useState } from "react";

type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  calendarId: string | null;
  calendarName: string;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastError: string;
  projectedEventCount: number;
  syncedEventCount: number;
  warning?: string;
};

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function oauthResultMessage(result: string | null) {
  if (result === "connected") {
    return { notice: "Google Calendar connected and initial synchronisation completed.", error: "" };
  }
  if (result === "cancelled") {
    return { notice: "Google Calendar connection was cancelled.", error: "" };
  }
  if (result === "not-configured") {
    return { notice: "", error: "Google Calendar server configuration is incomplete." };
  }
  if (["error", "expired", "invalid-state"].includes(result ?? "")) {
    return {
      notice: "",
      error: "Google Calendar could not be connected. Check the server logs and OAuth configuration, then try again.",
    };
  }
  return { notice: "", error: "" };
}

async function fetchCalendarStatus() {
  const response = await fetch("/api/integrations/google-calendar", { cache: "no-store" });
  const body = await response.json() as GoogleCalendarStatus | { error?: string };
  if (!response.ok || !("connected" in body)) {
    throw new Error(errorMessage(body, "Could not load Google Calendar status."));
  }
  return body;
}

export function GoogleCalendarSettings() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const resultMessage = oauthResultMessage(new URLSearchParams(window.location.search).get("calendar"));

    void fetchCalendarStatus()
      .then((loadedStatus) => {
        if (cancelled) return;
        setStatus(loadedStatus);
        if (resultMessage.notice) setNotice(resultMessage.notice);
        if (resultMessage.error) setError(resultMessage.error);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load Google Calendar status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function syncNow() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/integrations/google-calendar", { method: "POST" });
      const body = await response.json() as GoogleCalendarStatus | { error?: string };
      if (!response.ok || !("connected" in body)) {
        throw new Error(errorMessage(body, "Google Calendar could not be synchronised."));
      }
      setStatus(body);
      setNotice("Google Calendar synchronised.");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Google Calendar could not be synchronised.");
      const refreshed = await fetchCalendarStatus().catch(() => null);
      if (refreshed) setStatus(refreshed);
    } finally {
      setWorking(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar and delete the separate Personal Control Center calendar?")) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/integrations/google-calendar", { method: "DELETE" });
      const body = await response.json() as GoogleCalendarStatus | { error?: string };
      if (!response.ok || !("connected" in body)) {
        throw new Error(errorMessage(body, "Google Calendar could not be disconnected."));
      }
      setStatus(body);
      setNotice(body.warning || "Google Calendar disconnected.");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Google Calendar could not be disconnected.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-semibold">Google Calendar</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Dated Tasks and current project actions appear as all-day entries in a separate Personal Control Center calendar. Changes flow from this app to Google only.
          </p>
        </div>
        {status?.connected ? (
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Connected</span>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

      {loading ? <p className="mt-5 text-sm text-slate-500">Loading Calendar status…</p> : null}

      {!loading && status && !status.configured ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Google Calendar is not configured on this deployment. Add the Google OAuth client values and token-encryption key described in <code>docs/google-calendar.md</code>, then redeploy the app.
        </div>
      ) : null}

      {!loading && status?.configured && !status.connected ? (
        <div className="mt-5">
          <a
            className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            href="/api/integrations/google-calendar/connect"
          >
            Connect Google Calendar
          </a>
        </div>
      ) : null}

      {!loading && status?.connected ? (
        <div className="mt-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Calendar</dt>
              <dd className="mt-1 text-sm font-semibold">{status.calendarName}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Entries</dt>
              <dd className="mt-1 text-sm font-semibold">{status.syncedEventCount} / {status.projectedEventCount} synced</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Last sync</dt>
              <dd className="mt-1 text-sm font-semibold">{formatTimestamp(status.lastSyncedAt)}</dd>
            </div>
          </dl>

          {status.lastError ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Last synchronisation error: {status.lastError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              type="button"
              onClick={syncNow}
              disabled={working || !status.configured}
            >
              {working ? "Working…" : "Sync now"}
            </button>
            <button
              className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              type="button"
              onClick={disconnect}
              disabled={working}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
