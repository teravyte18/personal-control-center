import { getBookScore, parseBookDetails } from "./library.ts";
import { parseMediaDetails } from "./media.ts";
import { isStructuredPccNoteDescription, NOTE_ORDER_METADATA_TITLE } from "./notes.ts";
import type { Item, ProjectAction, ReviewEntry } from "./personal-data.ts";
import type { PersonalDataSnapshot } from "./personal-data-snapshot.ts";
import type { PersonalContextDomain } from "./personal-context.ts";

/**
 * Phase 1: an explicit allowlist, not a generic serialization of PCC storage.
 * Adding a new Personal Context domain does not automatically make it searchable.
 */
export const retrievalDomains = [
  "reviews", "library", "projects", "tasks", "thoughts", "notes",
] as const satisfies readonly PersonalContextDomain[];

export type RetrievalDomain = (typeof retrievalDomains)[number];

export type RetrievalDocument = {
  /** Unique within and across accounts; derived, never a new canonical ID. */
  id: string;
  userId: string;
  domain: RetrievalDomain;
  /** Stable canonical parent/source identifier for provenance and navigation. */
  sourceId: string;
  /** Present for a project action, which belongs to a project source. */
  sourceSubId?: string;
  sourceKind: "review" | "book" | "film" | "series" | "project" | "project-action" | "task" | "thought" | "note";
  title: string;
  /** Full eligible source text, deliberately not truncated to context limits. */
  text: string;
  occurredAt?: string;
  updatedAt?: string;
  metadata: Record<string, string | number | boolean | null>;
};

function documentId(userId: string, domain: RetrievalDomain, sourceId: string, sourceSubId?: string) {
  return [userId, domain, sourceId, ...(sourceSubId === undefined ? [] : ["action", sourceSubId])]
    .map(encodeURIComponent)
    .join(":");
}

function body(title: string, fields: Array<[string, string | undefined]>) {
  return [
    title.trim(),
    ...fields.flatMap(([label, value]) => value?.trim() ? [label + ": " + value.trim()] : []),
  ].join("\n\n");
}

function itemFields(item: Item): Array<[string, string | undefined]> {
  return [["Description", item.description]];
}

function projectActionDocument(userId: string, project: Item, action: ProjectAction): RetrievalDocument {
  const reschedules = action.reschedules?.map((entry) =>
    [entry.changedAt, entry.previousTargetDate || "(undated)", "→", entry.targetDate || "(undated)", entry.note ?? ""].join(" "),
  ).join("\n");

  return {
    id: documentId(userId, "projects", project.id, action.id),
    userId,
    domain: "projects",
    sourceId: project.id,
    sourceSubId: action.id,
    sourceKind: "project-action",
    title: action.title,
    text: body(action.title, [
      ["Project", project.title],
      ["Details", action.details],
      ["Completion note", action.completionNote],
      ["Reschedule history", reschedules],
    ]),
    occurredAt: action.openedAt,
    updatedAt: action.updatedAt,
    metadata: {
      projectStatus: project.status,
      area: project.area,
      completed: Boolean(action.completedAt),
      ...(action.targetDate ? { targetDate: action.targetDate } : {}),
      ...(action.completedAt ? { completedAt: action.completedAt } : {}),
    },
  };
}

function reviewDocument(userId: string, entry: ReviewEntry): RetrievalDocument {
  const title = "Weekly Review " + (entry.periodStart || entry.completedAt.slice(0, 10));
  return {
    id: documentId(userId, "reviews", entry.id),
    userId,
    domain: "reviews",
    sourceId: entry.id,
    sourceKind: "review",
    title,
    text: body(title, [
      ["Location", entry.location],
      ["What happened", entry.happened],
      ["Went well", entry.wentWell],
      ["Difficult", entry.difficult],
      ["Learned", entry.learned],
      ["Next week", entry.nextWeek],
    ]),
    occurredAt: entry.completedAt,
    updatedAt: entry.completedAt,
    metadata: { periodStart: entry.periodStart, periodEnd: entry.periodEnd },
  };
}

/**
 * Derive documents from a single user's canonical snapshot.
 *
 * Caller-supplied userId MUST be the authenticated account ID when this is
 * eventually used by the Phase 2 API. There is intentionally no public route,
 * database write, index, network request, LLM or context-window limit here.
 *
 * Archived and completed records remain eligible because they are still
 * retained by PCC; deleted records disappear when the snapshot is rebuilt.
 * Draft Reviews are excluded: they are live state, not completed history.
 * Keychain and other structured internal Note payloads are never projected.
 */
export function buildRetrievalDocuments(snapshot: PersonalDataSnapshot, userId: string): RetrievalDocument[] {
  if (!userId.trim()) throw new TypeError("A user ID is required for retrieval projection.");

  const documents: RetrievalDocument[] = [];
  for (const review of snapshot.history) {
    documents.push(reviewDocument(userId, review));
  }

  for (const item of snapshot.items) {
    if (item.kind === "project") {
      documents.push({
        id: documentId(userId, "projects", item.id),
        userId,
        domain: "projects",
        sourceId: item.id,
        sourceKind: "project",
        title: item.title,
        text: body(item.title, [
          ...itemFields(item),
          ["Project takeaways", item.projectTakeaways],
        ]),
        occurredAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: {
          status: item.status,
          area: item.area,
          ...(item.completedAt ? { completedAt: item.completedAt } : {}),
          ...(item.archivedAt ? { archivedAt: item.archivedAt } : {}),
        },
      });
      for (const action of item.actions) {
        documents.push(projectActionDocument(userId, item, action));
      }
      continue;
    }

    if (item.kind === "task" || item.kind === "thought") {
      const domain: RetrievalDomain = item.kind === "task" ? "tasks" : "thoughts";
      documents.push({
        id: documentId(userId, domain, item.id),
        userId,
        domain,
        sourceId: item.id,
        sourceKind: item.kind,
        title: item.title,
        text: body(item.title, itemFields(item)),
        occurredAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: {
          status: item.status,
          area: item.area,
          ...(item.checkInDate ? { checkInDate: item.checkInDate } : {}),
          ...(item.completedAt ? { completedAt: item.completedAt } : {}),
        },
      });
      continue;
    }

    if (item.kind !== "note") continue;

    // Books and media are serialized as Note payloads, but belong to Library.
    // Parse explicitly so raw JSON, cover IDs and unrelated secret records
    // cannot leak into search documents or ordinary Notes.
    const book = parseBookDetails(item.description);
    if (book) {
      const rating = getBookScore(book);
      documents.push({
        id: documentId(userId, "library", item.id),
        userId,
        domain: "library",
        sourceId: item.id,
        sourceKind: "book",
        title: item.title,
        text: body(item.title, [
          ["Author", book.author],
          ["Edition", book.editionNote],
          ["Reading state", book.readingState],
          ["Current issue", book.currentIssue],
          ["Issues read", book.issuesRead],
          ["Reflection", book.thoughts],
          ["Rating", rating === undefined ? undefined : String(rating)],
        ]),
        occurredAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: {
          type: book.contentType,
          format: book.format,
          readingState: book.readingState,
          ownership: book.ownership,
          priority: book.priority,
          status: item.status,
          ...(book.startDate ? { startDate: book.startDate } : {}),
          ...(book.finishDate ? { finishDate: book.finishDate } : {}),
          ...(rating === undefined ? {} : { rating }),
        },
      });
      continue;
    }

    const media = parseMediaDetails(item.description);
    if (media) {
      documents.push({
        id: documentId(userId, "library", item.id),
        userId,
        domain: "library",
        sourceId: item.id,
        sourceKind: media.type,
        title: item.title,
        text: body(item.title, [
          ["Status", media.status],
          ["Reflection", media.thoughts],
          ["Rating", media.rating === undefined ? undefined : String(media.rating)],
          ["Current season", media.currentSeason === undefined ? undefined : String(media.currentSeason)],
          ["Current episode", media.currentEpisode === undefined ? undefined : String(media.currentEpisode)],
        ]),
        occurredAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: {
          type: media.type,
          status: media.status,
          recordStatus: item.status,
          ...(media.rating === undefined ? {} : { rating: media.rating }),
          ...(media.watchedDate ? { watchedDate: media.watchedDate } : {}),
          ...(media.startDate ? { startDate: media.startDate } : {}),
          ...(media.finishDate ? { finishDate: media.finishDate } : {}),
        },
      });
      continue;
    }

    if (item.title === NOTE_ORDER_METADATA_TITLE || isStructuredPccNoteDescription(item.description)) continue;
    documents.push({
      id: documentId(userId, "notes", item.id),
      userId,
      domain: "notes",
      sourceId: item.id,
      sourceKind: "note",
      title: item.title,
      text: body(item.title, [["Body", item.description]]),
      occurredAt: item.createdAt,
      updatedAt: item.updatedAt,
      metadata: { status: item.status, area: item.area },
    });
  }

  // Independent of array ordering in the underlying JSON snapshot; stable for
  // diffing, caching and future deterministic search tests.
  return documents.sort((left, right) => left.id.localeCompare(right.id, "en"));
}
