"use client";

import { useMemo, useState } from "react";
import {
  personalContextDomains,
  personalContextPurposes,
  type PersonalContextDomain,
  type PersonalContextPurpose,
} from "@/domain/personal-context";
import {
  currentContextDomains,
  type CurrentContextDomain,
  type ResolvedContextResponse,
} from "@/domain/resolved-context";
import { retrievalDomains, type RetrievalDomain } from "@/domain/retrieval-documents";

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

async function responseBody(response: Response): Promise<unknown> {
  const body = await response.json() as unknown;
  if (!response.ok) {
    throw new Error(typeof body === "object" && body !== null && "error" in body
      && typeof body.error === "string" ? body.error : "Context could not be built.");
  }
  return body;
}

export default function ContextInspectorPage() {
  const [mode, setMode] = useState<"resolved" | "raw">("resolved");
  const [rawDomains, setRawDomains] = useState<PersonalContextDomain[]>(initialDomains);
  const [purpose, setPurpose] = useState<PersonalContextPurpose>("development");
  const [rawResult, setRawResult] = useState<unknown>(null);
  const [resolvedResult, setResolvedResult] = useState<ResolvedContextResponse | null>(null);
  const [query, setQuery] = useState("What did I write about my thesis?");
  const [searchDomains, setSearchDomains] = useState<RetrievalDomain[]>([...retrievalDomains]);
  const [includeCurrent, setIncludeCurrent] = useState<CurrentContextDomain[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [maxChars, setMaxChars] = useState("8000");
  const [maxRecords, setMaxRecords] = useState("12");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const rawRendered = useMemo(() => rawResult ? JSON.stringify(rawResult, null, 2) : "", [rawResult]);

  function toggleRaw(domain: PersonalContextDomain) {
    setRawDomains((current) => current.includes(domain)
      ? current.filter((candidate) => candidate !== domain) : [...current, domain]);
  }

  function toggleRetrieval(domain: RetrievalDomain) {
    setSearchDomains((current) => current.includes(domain)
      ? current.filter((candidate) => candidate !== domain) : [...current, domain]);
  }

  function toggleCurrent(domain: CurrentContextDomain) {
    setIncludeCurrent((current) => current.includes(domain)
      ? current.filter((candidate) => candidate !== domain) : [...current, domain]);
  }

  async function buildContext() {
    if (mode === "raw" && !rawDomains.length) {
      setError("Select at least one raw context domain.");
      return;
    }
    if (mode === "resolved" && !searchDomains.length) {
      setError("Select at least one historical search domain.");
      return;
    }
    if (mode === "resolved" && !query.trim()) {
      setError("Enter a test question.");
      return;
    }
    setError("");
    setLoading(true);
    if (mode === "resolved") setResolvedResult(null);
    else setRawResult(null);
    try {
      if (mode === "raw") {
        const params = new URLSearchParams({ domains: rawDomains.join(","), purpose });
        const response = await fetch("/api/personal-context?" + params, { cache: "no-store" });
        setRawResult(await responseBody(response));
      } else {
        const params = new URLSearchParams({
          q: query, domains: searchDomains.join(","), current: includeCurrent.join(","),
          maxChars, maxRecords, limit: "25",
        });
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const response = await fetch("/api/personal-context/resolve?" + params, { cache: "no-store" });
        setResolvedResult(await responseBody(response) as ResolvedContextResponse);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Context could not be built.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Development tool</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Context Inspector</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Inspect which PCC records a question retrieves and how a bounded context is assembled.
          Everything runs locally and deterministically, without an LLM. Keychain is always excluded.
        </p>
      </div>

      <div className="mt-5 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Inspector mode">
        <button type="button" aria-pressed={mode === "resolved"}
          onClick={() => { setMode("resolved"); setError(""); }}
          className={"rounded-lg px-3 py-2 text-sm font-semibold transition " + (mode === "resolved" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          Resolved question
        </button>
        <button type="button" aria-pressed={mode === "raw"}
          onClick={() => { setMode("raw"); setError(""); }}
          className={"rounded-lg px-3 py-2 text-sm font-semibold transition " + (mode === "raw" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          Raw domain context
        </button>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <form onSubmit={(event) => { event.preventDefault(); void buildContext(); }}
          className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {mode === "raw" ? (
            <>
              <label className="block text-sm font-semibold text-slate-800">
                Purpose
                <select className="input mt-2" value={purpose}
                  onChange={(event) => setPurpose(event.target.value as PersonalContextPurpose)}>
                  {personalContextPurposes.map((candidate) => (
                    <option key={candidate} value={candidate}>{purposeLabels[candidate]}</option>
                  ))}
                </select>
              </label>
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-slate-800">Domains</legend>
                <div className="mt-2 space-y-1">
                  {personalContextDomains.map((domain) => (
                    <label key={domain} className="flex min-h-9 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={rawDomains.includes(domain)}
                        onChange={() => toggleRaw(domain)} className="h-4 w-4 rounded border-slate-300"/>
                      {domainLabels[domain]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold text-slate-800">
                Test question
                <textarea className="input mt-2 w-full resize-y" rows={3} maxLength={240}
                  value={query} onChange={(event) => setQuery(event.target.value)}
                  placeholder="What did I say about…?"/>
              </label>
              <p className="mt-2 text-xs text-slate-500">
                This is keyword retrieval, not an answer from an AI. Try names or exact terms found in old records.
              </p>
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-slate-800">Search history in</legend>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {retrievalDomains.map((domain) => (
                    <label key={domain} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={searchDomains.includes(domain)}
                        onChange={() => toggleRetrieval(domain)} className="h-4 w-4 shrink-0"/>
                      {domainLabels[domain]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-slate-800">Also include current state</legend>
                <p className="mt-1 text-xs text-slate-500">Optional. Included because it is current, even if it does not match your words.</p>
                <div className="mt-2 space-y-1">
                  {currentContextDomains.map((domain) => (
                    <label key={domain} className="flex min-h-9 cursor-pointer items-center gap-2 px-1 text-sm text-slate-700">
                      <input type="checkbox" checked={includeCurrent.includes(domain)}
                        onChange={() => toggleCurrent(domain)} className="h-4 w-4"/>
                      {domainLabels[domain]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-slate-700">From (optional)
                  <input type="date" className="input mt-1 w-full min-w-0 text-xs" value={from}
                    onChange={(event) => setFrom(event.target.value)}/>
                </label>
                <label className="text-xs font-medium text-slate-700">To (optional)
                  <input type="date" className="input mt-1 w-full min-w-0 text-xs" value={to}
                    onChange={(event) => setTo(event.target.value)}/>
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-slate-700">Max context characters
                  <input type="number" min={1000} max={20000} step={1000}
                    className="input mt-1 w-full" value={maxChars}
                    onChange={(event) => setMaxChars(event.target.value)}/>
                </label>
                <label className="text-xs font-medium text-slate-700">Max context records
                  <input type="number" min={1} max={20} className="input mt-1 w-full"
                    value={maxRecords} onChange={(event) => setMaxRecords(event.target.value)}/>
                </label>
              </div>
            </>
          )}
          <button type="submit" disabled={loading || (mode === "resolved" ? !searchDomains.length || !query.trim() : !rawDomains.length)}
            className="mt-5 min-h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Building…" : mode === "resolved" ? "Resolve question" : "Build raw context"}
          </button>
          {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        </form>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {mode === "raw" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="font-semibold">Exact raw representation</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Existing bounded domain view.</p>
                </div>
                {rawRendered ? <p className="text-xs tabular-nums text-slate-500">
                  {rawRendered.length.toLocaleString()} chars · ~{Math.ceil(rawRendered.length / 4).toLocaleString()} tokens
                </p> : null}
              </div>
              {rawRendered ? (
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 text-slate-700">{rawRendered}</pre>
              ) : (
                <p className="p-6 text-sm text-slate-500">Choose the domains and build raw context to inspect the existing representation.</p>
              )}
            </>
          ) : resolvedResult ? (
            <div className="space-y-6 p-4 sm:p-5">
              <div>
                <h3 className="font-semibold">Resolved context</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Manual plan · {resolvedResult.search.totalMatches} keyword matches · {resolvedResult.currentCandidates.length} current candidates
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {resolvedResult.selected.length} included · {resolvedResult.excluded.length} excluded ·{" "}
                  {resolvedResult.budget.usedChars.toLocaleString()} / {resolvedResult.budget.maxChars.toLocaleString()} chars ·{" "}
                  ~{resolvedResult.budget.approximateTokens.toLocaleString()} tokens
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {resolvedResult.budget.deduplicatedMatches} overlapping search/current records deduplicated ·{" "}
                  {resolvedResult.budget.truncatedRecords} truncated
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Retrieval matches and ranking</h4>
                <p className="mt-1 text-xs text-slate-500">Scores explain lexical relevance; these results are not automatically all included.</p>
                {resolvedResult.search.results.length ? (
                  <div className="mt-3 space-y-2">
                    {resolvedResult.search.results.map((hit) => (
                      <div key={hit.id} className="min-w-0 rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="min-w-0 break-words text-sm font-medium text-slate-900">{hit.title}</p>
                          <span className="text-xs font-semibold text-slate-600">Score {hit.score}</span>
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {hit.domain} · {hit.sourceId}{hit.sourceSubId ? "/" + hit.sourceSubId : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{hit.reasons.join(" · ")}</p>
                        <p className="mt-2 break-words text-xs leading-5 text-slate-700">{hit.snippet}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-2 text-sm text-slate-500">No keyword matches. Try a different term or domain; this is not semantic search.</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold">Current-state candidates</h4>
                {resolvedResult.currentCandidates.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {resolvedResult.currentCandidates.map((item) => (
                      <li key={item.id} className="break-words">{item.domain}: {item.title} — {item.reasons.join("; ")}</li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-xs text-slate-500">None selected or currently available.</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold">Included records (final bundle)</h4>
                {resolvedResult.selected.length ? (
                  <div className="mt-2 space-y-2">
                    {resolvedResult.selected.map((item) => (
                      <details key={item.id} className="min-w-0 rounded-xl border border-slate-200 p-3">
                        <summary className="cursor-pointer break-words text-sm font-semibold text-slate-800">
                          {item.title} <span className="font-normal text-slate-500">({item.origin}, {item.domain}{item.truncated ? ", truncated" : ""})</span>
                        </summary>
                        <p className="mt-2 break-all text-xs text-slate-500">
                          Sources: {item.sourceRefs.map((ref) => ref.domain + "/" + ref.sourceId + (ref.sourceSubId ? "/" + ref.sourceSubId : "")).join(", ") || "Derived context"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{item.reasons.join(" · ")}</p>
                        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{item.content}</pre>
                      </details>
                    ))}
                  </div>
                ) : <p className="mt-1 text-sm text-slate-500">Nothing fits the selected query and current-state choices.</p>}
                {resolvedResult.excluded.length ? (
                  <details className="mt-3 text-xs text-slate-600">
                    <summary className="cursor-pointer font-medium">{resolvedResult.excluded.length} excluded by budget/record limits</summary>
                    <ul className="mt-2 space-y-1">
                      {resolvedResult.excluded.map((item) => <li key={item.id} className="break-words">{item.title}: {item.reason}</li>)}
                    </ul>
                  </details>
                ) : null}
              </div>
              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Exact final context text</summary>
                <pre className="mt-3 max-h-[45vh] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{resolvedResult.finalContext || "(empty)"}</pre>
              </details>
              <div className="space-y-1 text-xs text-slate-500">
                {resolvedResult.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h3 className="font-semibold">Question-driven context</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter a question to inspect matches across your complete eligible history, sources and scoring.
                You can optionally include current Tasks, Projects and Rhythm before applying context limits.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
