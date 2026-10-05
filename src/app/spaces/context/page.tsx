"use client";

import { useMemo, useState } from "react";
import {
  personalContextDomains,
  personalContextPurposes,
  type PersonalContextDomain,
  type PersonalContextPurpose,
} from "@/domain/personal-context";

const domainLabels: Record<PersonalContextDomain, string> = {
  projects: "Projects",
  tasks: "Tasks",
  reviews: "Reviews",
  rhythm: "Rhythm",
  thoughts: "Thoughts",
  notes: "Notes",
  library: "Library",
  food: "Food",
  expenses: "Expenses",
};

const purposeLabels: Record<PersonalContextPurpose, string> = {
  general: "General",
  "weekly-planning": "Weekly planning",
  reflection: "Reflection",
  conversation: "Conversation",
  development: "Development",
};

const initialDomains: PersonalContextDomain[] = ["projects", "tasks", "reviews", "rhythm", "thoughts", "library"];

export default function ContextInspectorPage() {
  const [selectedDomains, setSelectedDomains] = useState<PersonalContextDomain[]>(initialDomains);
  const [purpose, setPurpose] = useState<PersonalContextPurpose>("development");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rendered = useMemo(() => result ? JSON.stringify(result, null, 2) : "", [result]);
  const approximateTokens = rendered ? Math.ceil(rendered.length / 4) : 0;

  function toggleDomain(domain: PersonalContextDomain) {
    setSelectedDomains((current) => (
      current.includes(domain)
        ? current.filter((candidate) => candidate !== domain)
        : [...current, domain]
    ));
  }

  async function buildContext() {
    if (!selectedDomains.length) {
      setError("Select at least one domain.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        domains: selectedDomains.join(","),
        purpose,
      });
      const response = await fetch(`/api/personal-context?${params.toString()}`, { cache: "no-store" });
      const body = await response.json() as unknown;
      if (!response.ok) {
        const message = typeof body === "object"
          && body !== null
          && "error" in body
          && typeof body.error === "string"
          ? body.error
          : "Context could not be built.";
        throw new Error(message);
      }
      setResult(body);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Context could not be built.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Development tool</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Context Inspector</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Build the exact bounded representation PCC can expose to cross-space features. This is deterministic application
          data, not an AI summary. Keychain is not an available context domain.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-800">
            Purpose
            <select
              className="input mt-2"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value as PersonalContextPurpose)}
            >
              {personalContextPurposes.map((candidate) => (
                <option key={candidate} value={candidate}>{purposeLabels[candidate]}</option>
              ))}
            </select>
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-slate-800">Domains</legend>
            <div className="mt-2 space-y-1">
              {personalContextDomains.map((domain) => (
                <label
                  key={domain}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedDomains.includes(domain)}
                    onChange={() => toggleDomain(domain)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {domainLabels[domain]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => void buildContext()}
            disabled={loading || !selectedDomains.length}
            className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Building…" : "Build context"}
          </button>

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="font-semibold">Exact representation</h3>
              <p className="mt-0.5 text-xs text-slate-500">Only selected domains are present.</p>
            </div>
            {rendered ? (
              <p className="text-xs tabular-nums text-slate-500">
                {rendered.length.toLocaleString()} chars · ~{approximateTokens.toLocaleString()} tokens
              </p>
            ) : null}
          </div>

          {rendered ? (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 text-slate-700">
              {rendered}
            </pre>
          ) : (
            <div className="p-6 text-sm text-slate-500">
              Choose the domains you want to inspect, then build context.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
