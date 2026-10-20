import { buildPersonalContext } from "./personal-context.ts";
import type { PersonalDataSnapshot } from "./personal-data-snapshot.ts";
import {
  buildRetrievalDocuments,
  type RetrievalDocument,
  type RetrievalDomain,
} from "./retrieval-documents.ts";
import {
  parseRetrievalSearchParams,
  RetrievalSearchInputError,
  searchRetrievalDocuments,
  type RetrievalSearchOptions,
  type RetrievalSearchResponse,
} from "./retrieval-search.ts";

export const currentContextDomains = ["projects", "tasks", "rhythm"] as const;
export type CurrentContextDomain = (typeof currentContextDomains)[number];

export type ResolvedContextOptions = {
  search: RetrievalSearchOptions;
  includeCurrent: CurrentContextDomain[];
  maxChars: number;
  maxRecords: number;
};

export type ResolvedSourceRef = {
  domain: string;
  sourceId: string;
  sourceSubId?: string;
};

export type ResolvedContextItem = {
  id: string;
  origin: "current" | "retrieved";
  domain: RetrievalDomain | "rhythm";
  sourceKind: string;
  sourceId: string;
  sourceSubId?: string;
  title: string;
  reasons: string[];
  score?: number;
  sourceRefs: ResolvedSourceRef[];
  content: string;
  truncated: boolean;
};

export type ResolvedContextResponse = {
  version: 1;
  mode: "manual-deterministic";
  plan: {
    query: string;
    searchDomains: RetrievalDomain[];
    includeCurrent: CurrentContextDomain[];
    from?: string;
    to?: string;
    searchLimit: number;
  };
  search: RetrievalSearchResponse;
  currentCandidates: Array<Pick<ResolvedContextItem, "id" | "domain" | "title" | "reasons" | "sourceRefs">>;
  selected: ResolvedContextItem[];
  excluded: Array<{ id: string; title: string; reason: string }>;
  finalContext: string;
  budget: {
    maxChars: number;
    maxRecords: number;
    usedChars: number;
    approximateTokens: number;
    truncatedRecords: number;
    deduplicatedMatches: number;
  };
  warnings: string[];
};

type Candidate = Omit<ResolvedContextItem, "content" | "truncated"> & { text: string };

const ACTIVE = new Set(["active", "in-progress", "waiting"]);

export function parseResolvedContextParams(params: URLSearchParams): ResolvedContextOptions {
  const supported = new Set(["q", "domains", "from", "to", "limit", "current", "maxChars", "maxRecords"]);
  for (const key of params.keys()) {
    if (!supported.has(key)) throw new RetrievalSearchInputError("Unsupported resolved-context parameter.");
    if (params.getAll(key).length !== 1) throw new RetrievalSearchInputError("Repeated resolved-context parameters are not supported.");
  }

  // Phase 2 owns search validation; don't weaken or duplicate those rules.
  const searchParams = new URLSearchParams();
  for (const key of ["q", "domains", "from", "to", "limit"]) {
    const value = params.get(key);
    if (value !== null) searchParams.set(key, value);
  }
  const search = parseRetrievalSearchParams(searchParams);

  const currentValue = params.get("current") ?? "";
  const names = currentValue ? currentValue.split(",").map((name) => name.trim()) : [];
  if (names.some((name) => !currentContextDomains.includes(name as CurrentContextDomain))) {
    throw new RetrievalSearchInputError("Unsupported current-state domain.");
  }
  const includeCurrent = [...new Set(names)] as CurrentContextDomain[];

  function boundedInt(key: string, fallback: number, minimum: number, maximum: number) {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^[1-9]\d*$/.test(raw)) {
      throw new RetrievalSearchInputError(key + " must be an integer between " + minimum + " and " + maximum + ".");
    }
    const number = Number(raw);
    if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
      throw new RetrievalSearchInputError(key + " must be an integer between " + minimum + " and " + maximum + ".");
    }
    return number;
  }
  return {
    search,
    includeCurrent,
    maxChars: boundedInt("maxChars", 8000, 1000, 20000),
    maxRecords: boundedInt("maxRecords", 12, 1, 20),
  };
}

function reference(document: RetrievalDocument): ResolvedSourceRef {
  return {
    domain: document.domain,
    sourceId: document.sourceId,
    ...(document.sourceSubId ? { sourceSubId: document.sourceSubId } : {}),
  };
}

function derivedCandidate(document: RetrievalDocument, reasons: string[], score?: number): Candidate {
  return {
    id: document.id,
    origin: "current",
    domain: document.domain,
    sourceKind: document.sourceKind,
    sourceId: document.sourceId,
    ...(document.sourceSubId ? { sourceSubId: document.sourceSubId } : {}),
    title: document.title,
    text: document.text,
    reasons,
    ...(score === undefined ? {} : { score }),
    sourceRefs: [reference(document)],
  };
}

function currentCandidates(
  snapshot: PersonalDataSnapshot,
  documents: readonly RetrievalDocument[],
  options: ResolvedContextOptions,
  now: Date,
): Candidate[] {
  const selected = new Set(options.includeCurrent);
  const results: Candidate[] = [];
  const byMostRecent = (a: RetrievalDocument, b: RetrievalDocument) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.id.localeCompare(b.id, "en");

  if (selected.has("projects")) {
    const projects = documents
      .filter((doc) => doc.domain === "projects" && doc.sourceKind === "project" && ACTIVE.has(String(doc.metadata.status)))
      .sort(byMostRecent).slice(0, 6);
    for (const project of projects) {
      results.push(derivedCandidate(project, ["Active project selected from canonical current state"]));
      const openActions = documents
        .filter((doc) => doc.sourceKind === "project-action" && doc.sourceId === project.sourceId && doc.metadata.completed === false)
        .sort((a, b) =>
          String(a.metadata.targetDate ?? "9999").localeCompare(String(b.metadata.targetDate ?? "9999"))
          || byMostRecent(a, b))
        .slice(0, 2);
      for (const action of openActions) {
        results.push(derivedCandidate(action, ["Open action for a current project"]));
      }
    }
  }

  if (selected.has("tasks")) {
    const tasks = documents
      .filter((doc) => doc.domain === "tasks" && ACTIVE.has(String(doc.metadata.status)))
      .sort((a, b) =>
        String(a.metadata.checkInDate ?? "9999").localeCompare(String(b.metadata.checkInDate ?? "9999"))
        || byMostRecent(a, b))
      .slice(0, 8);
    for (const task of tasks) {
      results.push(derivedCandidate(task, ["Open task selected from canonical current state"]));
    }
  }

  if (selected.has("rhythm")) {
    const rhythm = buildPersonalContext(snapshot, {
      domains: ["rhythm"], purpose: "weekly-planning", now,
    }).domains.rhythm;
    if (rhythm && (rhythm.intentions.length || rhythm.weeklyFocus.length)) {
      const sourceRefs: ResolvedSourceRef[] = [
        ...rhythm.intentions.map((item) => ({ domain: "rhythm-template", sourceId: item.id })),
        ...rhythm.weeklyFocus.map((item) => ({ domain: "weekly-focus", sourceId: item.id })),
      ];
      results.push({
        id: "current-rhythm:" + rhythm.periodStart,
        origin: "current",
        domain: "rhythm",
        sourceKind: "derived-rhythm-snapshot",
        sourceId: rhythm.periodStart,
        title: "Weekly Rhythm · " + rhythm.periodStart + "–" + rhythm.periodEnd,
        text: JSON.stringify(rhythm, null, 2),
        reasons: ["Current week, derived from the existing bounded Rhythm context provider"],
        sourceRefs,
      });
    }
  }
  return results;
}

function packCandidates(candidates: Candidate[], maxChars: number, maxRecords: number) {
  const selected: ResolvedContextItem[] = [];
  const excluded: Array<{ id: string; title: string; reason: string }> = [];
  let finalContext = "";
  let truncatedRecords = 0;

  for (const candidate of candidates) {
    if (selected.length >= maxRecords) {
      excluded.push({ id: candidate.id, title: candidate.title, reason: "Record limit reached" });
      continue;
    }
    const sectionPrefix = finalContext.length ? "\n\n" : "";
    const safeTitle = candidate.title.replace(/\s+/g, " ").slice(0, 180);
    const header = "[" + candidate.origin + "] " + candidate.domain + "/" + candidate.sourceId
      + (candidate.sourceSubId ? "/" + candidate.sourceSubId : "") + " — " + safeTitle + "\n";
    const remaining = maxChars - finalContext.length - sectionPrefix.length - header.length;
    if (remaining < 80) {
      excluded.push({ id: candidate.id, title: candidate.title, reason: "Character budget exhausted" });
      continue;
    }
    const original = candidate.text.trim();
    const maximum = Math.min(1800, remaining);
    const truncated = original.length > maximum;
    const content = truncated
      ? original.slice(0, Math.max(1, maximum - 1)).trimEnd() + "…"
      : original;
    finalContext += sectionPrefix + header + content;
    if (truncated) truncatedRecords++;
    const { text: _text, ...details } = candidate;
    selected.push({ ...details, content, truncated });
  }
  return { selected, excluded, finalContext, truncatedRecords };
}

/**
 * Resolves one explicitly configured question against one account's canonical
 * snapshot. Phase 3 deliberately has NO model planner, hidden inferred domain
 * choice, external calls or independent memory store.
 *
 * Historical candidates are searched before any record/budget caps. Current
 * candidates are independently constructed only from explicitly selected
 * domains. Duplicates are resolved by canonical document ID; matching terms
 * are kept as explanations when the same record is also selected as current.
 */
export function resolvePersonalContext(
  snapshot: PersonalDataSnapshot,
  userId: string,
  options: ResolvedContextOptions,
  now = new Date(),
): ResolvedContextResponse {
  const documents = buildRetrievalDocuments(snapshot, userId);
  const search = searchRetrievalDocuments(documents, userId, options.search, now);
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const matched = new Map(search.results.map((hit) => [hit.id, hit]));
  const current = currentCandidates(snapshot, documents, options, now).map((candidate) => {
    const hit = matched.get(candidate.id);
    return hit
      ? { ...candidate, score: hit.score, reasons: [...candidate.reasons, ...hit.reasons] }
      : candidate;
  });
  const currentIds = new Set(current.map((candidate) => candidate.id));
  const history = search.results.flatMap((hit): Candidate[] => {
    if (currentIds.has(hit.id)) return [];
    const document = byId.get(hit.id);
    if (!document) return [];
    return [{
      id: document.id,
      origin: "retrieved",
      domain: document.domain,
      sourceKind: document.sourceKind,
      sourceId: document.sourceId,
      ...(document.sourceSubId ? { sourceSubId: document.sourceSubId } : {}),
      title: document.title,
      text: document.text,
      score: hit.score,
      reasons: hit.reasons,
      sourceRefs: [reference(document)],
    }];
  });

  // Reserve some slots for current state if expressly requested, but don't
  // let unrelated current records crowd every historical match out.
  const currentReserved = history.length
    ? Math.min(current.length, Math.max(1, Math.floor(options.maxRecords / 3)))
    : current.length;
  const ordered = [
    ...current.slice(0, currentReserved),
    ...history,
    ...current.slice(currentReserved),
  ];
  const packed = packCandidates(ordered, options.maxChars, options.maxRecords);

  return {
    version: 1,
    mode: "manual-deterministic",
    plan: {
      query: options.search.query,
      searchDomains: options.search.domains,
      includeCurrent: options.includeCurrent,
      ...(options.search.from ? { from: options.search.from } : {}),
      ...(options.search.to ? { to: options.search.to } : {}),
      searchLimit: options.search.limit,
    },
    search,
    currentCandidates: current.map(({ id, domain, title, reasons, sourceRefs }) => ({
      id, domain, title, reasons, sourceRefs,
    })),
    selected: packed.selected,
    excluded: packed.excluded,
    finalContext: packed.finalContext,
    budget: {
      maxChars: options.maxChars,
      maxRecords: options.maxRecords,
      usedChars: packed.finalContext.length,
      approximateTokens: Math.ceil(packed.finalContext.length / 4),
      truncatedRecords: packed.truncatedRecords,
      deduplicatedMatches: search.results.filter((hit) => currentIds.has(hit.id)).length,
    },
    warnings: [
      "Keyword search is deterministic, not semantic: wording differences may hide relevant older records.",
      "Current domains and historical search domains were chosen explicitly; no LLM selected them.",
      ...(packed.excluded.length ? ["Some candidates were excluded by the selected context limits."] : []),
    ],
  };
}
