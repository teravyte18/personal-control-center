"use client";

import { useState } from "react";
import { useDataConnection } from "@/providers/personal-data-provider";

export function DataStatusBanner() {
  const {
    dataMode,
    syncing,
    syncError,
    migrationRequired,
    downloadLocalBackup,
    importLocalData,
  } = useDataConnection();
  const [importing, setImporting] = useState(false);

  if (dataMode === "loading") return null;

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
      <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 shadow-sm" aria-live="assertive">
        <p className="text-sm font-semibold">Server persistence is unavailable</p>
        <p className="mt-1 text-sm leading-6 text-rose-800">
          Changes are being kept in this browser so they are not lost, but other devices will not see them yet.
        </p>
        {syncError ? <p className="mt-2 text-sm font-medium text-rose-700">{syncError}</p> : null}
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

  if (syncing) {
    return <p className="mb-3 text-right text-xs font-medium text-slate-400" aria-live="polite">Saving to server…</p>;
  }

  return null;
}
