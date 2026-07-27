"use client";

import { useState } from "react";
import { useOfflineCapture } from "@/providers/offline-capture-provider";
import { useDataConnection } from "@/providers/personal-data-provider";

const LOCAL_DEVELOPMENT = process.env.NEXT_PUBLIC_PCC_LOCAL_DEV_MODE === "1";

export function DataStatusBanner() {
  const {
    dataMode,
    syncing,
    syncError,
    migrationRequired,
    downloadLocalBackup,
    importLocalData,
  } = useDataConnection();
  const {
    online,
    pending,
    syncing: captureSyncing,
    lastError: captureError,
    retry,
  } = useOfflineCapture();
  const [importing, setImporting] = useState(false);

  if (dataMode === "loading") return null;

  if (LOCAL_DEVELOPMENT && dataMode === "local-fallback") {
    return (
      <section className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 shadow-sm" aria-live="polite">
        <p className="text-sm font-semibold">Local development mode</p>
        <p className="mt-1 text-sm leading-6 text-sky-800">Changes are stored only in this browser. Production, PostgreSQL, backups, and other devices are untouched.</p>
      </section>
    );
  }

  if (migrationRequired) {
    async function migrate() {
      setImporting(true);
      await importLocalData();
      setImporting(false);
    }

    return (
      <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm" aria-live="polite">
        <p className="text-sm font-semibold">Move this browser&apos;s data to the server</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          PostgreSQL is empty and this browser contains existing data. A JSON backup is downloaded before import.
        </p>
        {syncError ? <p className="mt-2 text-sm font-medium text-rose-700">{syncError}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadLocalBackup}
            className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-950"
          >
            Download backup
          </button>
          <button
            type="button"
            onClick={() => void migrate()}
            disabled={importing || syncing}
            className="min-h-11 rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {importing || syncing ? "Moving data…" : "Back up and move to server"}
          </button>
        </div>
      </section>
    );
  }

  if (dataMode === "local-fallback") {
    return (
      <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm" aria-live="assertive">
        <p className="text-sm font-semibold">Offline capture is available</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Quick Capture can be queued safely on this device. Avoid organising Inbox items or editing Projects, Tasks, and Reviews until the server connection returns.
        </p>
        {pending.length > 0 ? <p className="mt-2 text-sm font-semibold text-amber-900">{pending.length} {pending.length === 1 ? "capture is" : "captures are"} waiting to sync.</p> : null}
        {captureError || syncError ? <p className="mt-2 text-sm font-medium text-rose-700">{captureError || syncError}</p> : null}
        <button
          type="button"
          onClick={() => void retry()}
          disabled={!online || captureSyncing}
          className="mt-3 min-h-10 rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {captureSyncing ? "Checking…" : online ? "Reconnect now" : "Waiting for connection"}
        </button>
      </section>
    );
  }

  if (pending.length > 0) {
    return (
      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
        <div>
          <p className="text-sm font-semibold">{pending.length} offline {pending.length === 1 ? "capture is" : "captures are"} pending</p>
          <p className="mt-1 text-sm text-amber-800">They remain stored on this device until the server confirms them.</p>
          {captureError ? <p className="mt-1 text-xs font-medium text-rose-700">{captureError}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void retry()}
          disabled={!online || captureSyncing}
          className="min-h-10 shrink-0 rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {captureSyncing ? "Syncing…" : "Retry now"}
        </button>
      </section>
    );
  }

  if (syncError) {
    return (
      <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900" aria-live="polite">
        {syncError}
      </section>
    );
  }

  if (syncing || captureSyncing) {
    return <p className="mb-3 text-right text-xs font-medium text-slate-400" aria-live="polite">Saving to server…</p>;
  }

  return null;
}
