import { retrievalDomains, type RetrievalDocument, type RetrievalDomain } from "./retrieval-documents.ts";

export type RetrievalSearchOptions = {
  query: string;
  domains: RetrievalDomain[];
  from?: string;
  to?: string;
  limit: number;
};

export type RetrievalSearchHit = Pick<
  RetrievalDocument,
  "id" | "domain" | "sourceId" | "sourceSubId" | "sourceKind" | "title" | "occurredAt" | "updatedAt" | "metadata"
> & {
  score: number;
  reasons: string[];
  snippet: string;
};

export type RetrievalSearchResponse = {
  query: RetrievalSearchOptions;
  totalMatches: number;
  results: RetrievalSearchHit[];
};

export class RetrievalSearchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetrievalSearchInputError";
  }
}

const SEARCH_LIMIT_DEFAULT = 10;
const SEARCH_LIMIT_MAX = 25;
const QUERY_MAX_LENGTH = 240;

// Search only: these are not stripped from the stored source text.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "about", "be", "by", "can", "did",
  "do", "does", "for", "from", "had", "has", "have", "how", "i", "in", "is",
  "it", "my", "of", "on", "or", "our", "that", "the", "their", "this", "to",
  "was", "were", "what", "when", "where", "which", "who", "why", "with",
  "write", "wrote", "said", "tell", "me", "find", "show",
  "aos", "ao", "a", "com", "como", "da", "das", "de", "do", "dos", "e", "em",
  "eu", "foi", "mais", "me", "meu", "minha", "na", "nas", "no", "nos",
  "o", "os", "ou", "para", "por", "que", "se", "sobre", "um", "uma",
]);

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function terms(value: string) {
  return [...new Set(normalize(value).split(" ").filter((part) => part && !STOPWORDS.has(part)))];
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseRetrievalSearchParams(params: URLSearchParams): RetrievalSearchOptions {
  const supported = new Set(["q", "domains", "from", "to", "limit"]);
  for (const key of params.keys()) {
    if (!supported.has(key)) throw new RetrievalSearchInputError("Unsupported search parameter.");
    if (params.getAll(key).length !== 1) throw new RetrievalSearchInputError("Repeated search parameters are not supported.");
  }
  const query = (params.get("q") ?? "").trim();
  if (!query || query.length > QUERY_MAX_LENGTH) {
    throw new RetrievalSearchInputError("Search query must be between 1 and 240 characters.");
  }
  const tokens = terms(query);
  if (!tokens.length || tokens.length > 16) {
    throw new RetrievalSearchInputError("Enter between 1 and 16 meaningful search terms.");
  }
  const rawDomains = params.get("domains");
  const domainNames = rawDomains === null ? [...retrievalDomains] : rawDomains.split(",").map((entry) => entry.trim());
  if (!domainNames.length || domainNames.some((name) => !retrievalDomains.includes(name as RetrievalDomain))) {
    throw new RetrievalSearchInputError("Select one or more supported retrieval domains.");
  }
  const domains = [...new Set(domainNames)] as RetrievalDomain[];
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  if ((from && !isValidDate(from)) || (to && !isValidDate(to)) || (from && to && from > to)) {
    throw new RetrievalSearchInputError("Enter a valid inclusive date range (YYYY-MM-DD).");
  }
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? SEARCH_LIMIT_DEFAULT : Number(rawLimit);
  if (rawLimit !== null && !/^[1-9]\d*$/.test(rawLimit)) {
    throw new RetrievalSearchInputError("Search limit must be an integer between 1 and 25.");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > SEARCH_LIMIT_MAX) {
    throw new RetrievalSearchInputError("Search limit must be an integer between 1 and 25.");
  }
  return { query, domains, from, to, limit };
}

function hasWord(text: string, word: string) {
  return (" " + text + " ").includes(" " + word + " ");
}

function excerpt(text: string, tokens: string[]) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  const lowercase = collapsed.toLocaleLowerCase("en");
  const position = tokens.map((term) => lowercase.indexOf(term)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, position - 70);
  const end = Math.min(collapsed.length, start + 360);
  return (start ? "…" : "") + collapsed.slice(start, end) + (end < collapsed.length ? "…" : "");
}

function scoreDocument(document: RetrievalDocument, tokens: string[], phrase: string, now: Date) {
  const title = normalize(document.title);
  const text = normalize(document.text);
  const titleHits = tokens.filter((term) => hasWord(title, term));
  const bodyHits = tokens.filter((term) => hasWord(text, term));
  if (!bodyHits.length && !titleHits.length) return null;

  let score = 0;
  const reasons: string[] = [];

  if (title === phrase) {
    score += 120;
    reasons.push("Exact title match");
  } else if (phrase.includes(" ") && (" " + title + " ").includes(" " + phrase + " ")) {
    score += 48;
    reasons.push("Title contains search phrase");
  }

  if (titleHits.length) {
    score += titleHits.length * 18;
    reasons.push("Title terms: " + titleHits.join(", "));
  }
  if (titleHits.length === tokens.length && tokens.length > 1) {
    score += 25;
    reasons.push("All search terms in title");
  }
  if (bodyHits.length) {
    score += bodyHits.length * 4;
    if (bodyHits.length !== titleHits.length || titleHits.length === 0) {
      reasons.push("Text terms: " + bodyHits.join(", "));
    }
  }
  if (phrase.includes(" ") && (" " + text + " ").includes(" " + phrase + " ")) {
    score += 12;
    reasons.push("Search phrase occurs in text");
  }
  score += Math.round(12 * bodyHits.length / tokens.length);

  // Small tie-breakers only; relevance beats popularity or recency.
  const status = document.metadata.status ?? document.metadata.projectStatus;
  if (status === "active" || status === "in-progress" || status === "reading") {
    score += 3;
    reasons.push("Active record");
  }
  const updated = Date.parse(document.updatedAt ?? "");
  const age = now.getTime() - updated;
  if (Number.isFinite(age) && age >= 0 && age <= 90 * 24 * 60 * 60 * 1000) {
    score += 2;
    reasons.push("Recently updated");
  }
  return { score, reasons };
}

/**
 * Pure, bounded lexical search. All candidate docs have already been generated
 * from a single authenticated snapshot by the API; also enforce userId here
 * to prevent future callers from accidentally searching mixed-account input.
 *
 * The search corpus is NOT restricted to the output limit. Only the returned
 * result list and snippets are capped. Never send full source bodies to the
 * Phase 2 client; Phase 3 can resolve selected IDs from canonical state.
 */
export function searchRetrievalDocuments(
  documents: readonly RetrievalDocument[],
  userId: string,
  options: RetrievalSearchOptions,
  now = new Date(),
): RetrievalSearchResponse {
  if (!userId.trim()) throw new TypeError("A user ID is required for retrieval search.");
  const tokens = terms(options.query);
  if (!tokens.length) throw new RetrievalSearchInputError("Enter a meaningful search query.");
  const phrase = tokens.join(" ");
  const domains = new Set(options.domains);

  const matches: RetrievalSearchHit[] = [];
  for (const document of documents) {
    if (document.userId !== userId || !domains.has(document.domain)) continue;
    // Date filters are based on the event/record creation time (Review
    // completedAt, action openedAt, item createdAt), NOT the last edit date.
    const occurred = (document.occurredAt ?? document.updatedAt ?? "").slice(0, 10);
    if (options.from && occurred < options.from) continue;
    if (options.to && occurred > options.to) continue;

    const scored = scoreDocument(document, tokens, phrase, now);
    if (!scored) continue;
    matches.push({
      id: document.id,
      domain: document.domain,
      sourceId: document.sourceId,
      ...(document.sourceSubId === undefined ? {} : { sourceSubId: document.sourceSubId }),
      sourceKind: document.sourceKind,
      title: document.title,
      snippet: excerpt(document.text, tokens),
      score: scored.score,
      reasons: scored.reasons,
      ...(document.occurredAt === undefined ? {} : { occurredAt: document.occurredAt }),
      ...(document.updatedAt === undefined ? {} : { updatedAt: document.updatedAt }),
      metadata: document.metadata,
    });
  }
  matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, "en"));
  return { query: options, totalMatches: matches.length, results: matches.slice(0, options.limit) };
}
