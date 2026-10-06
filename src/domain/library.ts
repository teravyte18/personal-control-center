import type { Item } from "./personal-data";

export const BOOK_DESCRIPTION_PREFIX = "__pcc_book_v3__\n";
const BOOK_DESCRIPTION_V2_PREFIX = "__pcc_book_v2__\n";
const LEGACY_BOOK_DESCRIPTION_PREFIX = "__pcc_book_v1__\n";

export const bookReadingStates = ["unread", "reading", "finished", "paused", "abandoned"] as const;
export type BookReadingState = (typeof bookReadingStates)[number];

export const bookOwnershipStates = ["unspecified", "owned", "borrowed", "wishlist"] as const;
export type BookOwnershipState = (typeof bookOwnershipStates)[number];

export const bookPriorities = ["none", "up-next", "soon", "later"] as const;
export type BookPriority = (typeof bookPriorities)[number];

export const bookContentTypes = ["book", "comic"] as const;
export type BookContentType = (typeof bookContentTypes)[number];

export const bookFormats = ["unspecified", "physical", "digital", "both"] as const;
export type BookFormat = (typeof bookFormats)[number];

export type BookRatings = {
  enjoyment?: number;
  impact?: number;
  execution?: number;
  overallOverride?: number;
};

export type BookDetails = {
  author: string;
  editionNote: string;
  contentType: BookContentType;
  format: BookFormat;
  currentIssue: string;
  issuesRead: string;
  readingState: BookReadingState;
  ownership: BookOwnershipState;
  priority: BookPriority;
  startDate: string;
  finishDate: string;
  thoughts: string;
  coverId: string;
  upNextOrder: number;
  ratings: BookRatings;
};

export type BookItem = {
  item: Item;
  details: BookDetails;
};

export type BookShelfId = "all" | "owned" | "reading" | "up-next" | "owned-unread" | "wishlist" | "finished" | "paused";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function validDateOnlyOrEmpty(value: unknown) {
  if (value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return Number.isNaN(Date.parse(`${value}T00:00:00`)) ? "" : value;
}

function normalizeRating(value: unknown, scale = 1): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const scaled = value * scale;
  if (scaled < 0 || scaled > 10) return undefined;
  return Math.round(scaled * 2) / 2;
}

function isReadingState(value: unknown): value is BookReadingState {
  return typeof value === "string" && bookReadingStates.includes(value as BookReadingState);
}

function isOwnership(value: unknown): value is BookOwnershipState {
  return typeof value === "string" && bookOwnershipStates.includes(value as BookOwnershipState);
}

function isPriority(value: unknown): value is BookPriority {
  return typeof value === "string" && bookPriorities.includes(value as BookPriority);
}

function isContentType(value: unknown): value is BookContentType {
  return typeof value === "string" && bookContentTypes.includes(value as BookContentType);
}

function isBookFormat(value: unknown): value is BookFormat {
  return typeof value === "string" && bookFormats.includes(value as BookFormat);
}

export function createBookDetails(thoughts = ""): BookDetails {
  return {
    author: "",
    editionNote: "",
    contentType: "book",
    format: "unspecified",
    currentIssue: "",
    issuesRead: "",
    readingState: "unread",
    ownership: "unspecified",
    priority: "none",
    startDate: "",
    finishDate: "",
    thoughts,
    coverId: "",
    upNextOrder: 0,
    ratings: {},
  };
}

export function normalizeBookDetails(value: unknown, ratingScale = 1): BookDetails {
  const defaults = createBookDetails();
  if (!isRecord(value)) return defaults;
  const ratings = isRecord(value.ratings) ? value.ratings : {};
  const upNextOrder = typeof value.upNextOrder === "number" && Number.isFinite(value.upNextOrder) && value.upNextOrder > 0
    ? Math.floor(value.upNextOrder)
    : 0;

  return {
    author: stringOrEmpty(value.author).trim(),
    editionNote: stringOrEmpty(value.editionNote).trim(),
    contentType: isContentType(value.contentType) ? value.contentType : defaults.contentType,
    format: isBookFormat(value.format) ? value.format : defaults.format,
    currentIssue: stringOrEmpty(value.currentIssue).trim(),
    issuesRead: stringOrEmpty(value.issuesRead).trim(),
    readingState: isReadingState(value.readingState) ? value.readingState : defaults.readingState,
    ownership: isOwnership(value.ownership) ? value.ownership : defaults.ownership,
    priority: isPriority(value.priority) ? value.priority : defaults.priority,
    startDate: validDateOnlyOrEmpty(value.startDate),
    finishDate: validDateOnlyOrEmpty(value.finishDate),
    thoughts: stringOrEmpty(value.thoughts),
    coverId: stringOrEmpty(value.coverId).trim(),
    upNextOrder,
    ratings: {
      enjoyment: normalizeRating(ratings.enjoyment, ratingScale),
      impact: normalizeRating(ratings.impact, ratingScale),
      execution: normalizeRating(ratings.execution, ratingScale),
      overallOverride: normalizeRating(ratings.overallOverride, ratingScale),
    },
  };
}

export function serializeBookDetails(details: BookDetails) {
  return `${BOOK_DESCRIPTION_PREFIX}${JSON.stringify(normalizeBookDetails(details))}`;
}

export function parseBookDetails(description: string): BookDetails | null {
  const legacyV1 = description.startsWith(LEGACY_BOOK_DESCRIPTION_PREFIX);
  const legacyV2 = description.startsWith(BOOK_DESCRIPTION_V2_PREFIX);
  const prefix = legacyV1
    ? LEGACY_BOOK_DESCRIPTION_PREFIX
    : legacyV2
      ? BOOK_DESCRIPTION_V2_PREFIX
      : BOOK_DESCRIPTION_PREFIX;
  if (!description.startsWith(prefix)) return null;
  try {
    return normalizeBookDetails(JSON.parse(description.slice(prefix.length)) as unknown, legacyV1 ? 2 : 1);
  } catch {
    return null;
  }
}

export function isBookItem(item: Pick<Item, "kind" | "description">) {
  return item.kind === "note" && parseBookDetails(item.description) !== null;
}

export function getBooks(items: readonly Item[]): BookItem[] {
  return items.flatMap((item): BookItem[] => {
    if (item.status !== "active" || item.kind !== "note") return [];
    const details = parseBookDetails(item.description);
    return details ? [{ item, details }] : [];
  });
}

export function getBookScore(details: BookDetails): number | undefined {
  if (details.ratings.overallOverride !== undefined) return details.ratings.overallOverride;
  const values = [details.ratings.enjoyment, details.ratings.impact, details.ratings.execution]
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function bookMatchesShelf(book: BookItem, shelf: BookShelfId) {
  const { details } = book;
  switch (shelf) {
    case "all":
      return details.ownership !== "wishlist";
    case "owned":
      return details.ownership === "owned";
    case "reading":
      return details.ownership !== "wishlist" && details.readingState === "reading";
    case "up-next":
      return details.ownership !== "wishlist"
        && details.priority === "up-next"
        && ["unread", "paused"].includes(details.readingState);
    case "owned-unread":
      return details.ownership === "owned" && details.readingState === "unread";
    case "wishlist":
      return details.ownership === "wishlist";
    case "finished":
      return details.ownership !== "wishlist" && details.readingState === "finished";
    case "paused":
      return details.ownership !== "wishlist" && ["paused", "abandoned"].includes(details.readingState);
  }
}

export function sortBooksForShelf(books: readonly BookItem[], shelf: BookShelfId) {
  return [...books]
    .filter((book) => bookMatchesShelf(book, shelf))
    .sort((left, right) => {
      if (shelf === "up-next") {
        const leftOrdered = left.details.upNextOrder > 0;
        const rightOrdered = right.details.upNextOrder > 0;
        if (leftOrdered && rightOrdered && left.details.upNextOrder !== right.details.upNextOrder) {
          return left.details.upNextOrder - right.details.upNextOrder;
        }
        if (leftOrdered !== rightOrdered) return leftOrdered ? -1 : 1;
      }
      if (shelf === "owned") {
        const leftScore = getBookScore(left.details);
        const rightScore = getBookScore(right.details);
        if (leftScore !== undefined && rightScore !== undefined && leftScore !== rightScore) {
          return rightScore - leftScore;
        }
        if (leftScore !== undefined && rightScore === undefined) return -1;
        if (leftScore === undefined && rightScore !== undefined) return 1;
      }
      if (shelf === "finished") {
        const byFinish = right.details.finishDate.localeCompare(left.details.finishDate);
        if (byFinish) return byFinish;
      }
      if (shelf === "reading") {
        const byStart = right.details.startDate.localeCompare(left.details.startDate);
        if (byStart) return byStart;
      }
      return left.item.title.localeCompare(right.item.title, undefined, { sensitivity: "base" });
    });
}

export function reorderUpNext(books: readonly BookItem[], bookId: string, direction: -1 | 1) {
  const ordered = sortBooksForShelf(books, "up-next");
  const index = ordered.findIndex((book) => book.item.id === bookId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return [];

  const reordered = [...ordered];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered.map((book, order) => ({
    ...book,
    details: { ...book.details, upNextOrder: order + 1 },
  }));
}

export function formatBookScore(details: BookDetails) {
  const score = getBookScore(details);
  return score === undefined ? "" : score.toFixed(1);
}

export function dateWithinPeriod(value: string, start: string, end: string) {
  return Boolean(value && value >= start && value <= end);
}
