import type { Item } from "./personal-data";

export const MEDIA_DESCRIPTION_PREFIX = "__pcc_media_v1__\n";

export const mediaTypes = ["film", "series"] as const;
export type MediaType = (typeof mediaTypes)[number];

export const mediaStatuses = ["wishlist", "watching", "completed", "dropped"] as const;
export type MediaStatus = (typeof mediaStatuses)[number];

export type MediaDetails = {
  type: MediaType;
  status: MediaStatus;
  rating?: number;
  thoughts: string;
  posterId: string;
  startDate: string;
  finishDate: string;
  currentSeason?: number;
  currentEpisode?: number;
};

export type MediaItem = {
  item: Item;
  details: MediaDetails;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isMediaType(value: unknown): value is MediaType {
  return typeof value === "string" && mediaTypes.includes(value as MediaType);
}

function isMediaStatus(value: unknown): value is MediaStatus {
  return typeof value === "string" && mediaStatuses.includes(value as MediaStatus);
}

function normalizeRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) return undefined;
  return Math.round(value * 2) / 2;
}

function normalizePositiveInteger(value: unknown, maximum = 9999) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  return normalized > 0 && normalized <= maximum ? normalized : undefined;
}

function normalizeDate(value: unknown) {
  const candidate = stringOrEmpty(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return "";
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate) return "";
  return candidate;
}

export function createMediaDetails(): MediaDetails {
  return {
    type: "film",
    status: "wishlist",
    thoughts: "",
    posterId: "",
    startDate: "",
    finishDate: "",
  };
}

export function normalizeMediaDetails(value: unknown): MediaDetails {
  const defaults = createMediaDetails();
  if (!isRecord(value)) return defaults;

  const type = isMediaType(value.type) ? value.type : defaults.type;
  return {
    type,
    status: isMediaStatus(value.status) ? value.status : defaults.status,
    rating: normalizeRating(value.rating),
    thoughts: stringOrEmpty(value.thoughts).replace(/\r\n?/g, "\n"),
    posterId: stringOrEmpty(value.posterId).trim(),
    startDate: normalizeDate(value.startDate),
    finishDate: normalizeDate(value.finishDate),
    currentSeason: type === "series" ? normalizePositiveInteger(value.currentSeason) : undefined,
    currentEpisode: type === "series" ? normalizePositiveInteger(value.currentEpisode) : undefined,
  };
}

export function serializeMediaDetails(details: MediaDetails) {
  return `${MEDIA_DESCRIPTION_PREFIX}${JSON.stringify(normalizeMediaDetails(details))}`;
}

export function parseMediaDetails(description: string): MediaDetails | null {
  if (!description.startsWith(MEDIA_DESCRIPTION_PREFIX)) return null;
  try {
    return normalizeMediaDetails(JSON.parse(description.slice(MEDIA_DESCRIPTION_PREFIX.length)) as unknown);
  } catch {
    return null;
  }
}

export function isMediaItem(item: Pick<Item, "kind" | "description">) {
  return item.kind === "note" && parseMediaDetails(item.description) !== null;
}

export function getMediaItems(items: readonly Item[]): MediaItem[] {
  return items.flatMap((item): MediaItem[] => {
    if (item.status !== "active" || item.kind !== "note") return [];
    const details = parseMediaDetails(item.description);
    return details ? [{ item, details }] : [];
  });
}

export function mediaMatchesQuery(media: MediaItem, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || media.item.title.toLocaleLowerCase().includes(normalized);
}

const statusOrder: Record<MediaStatus, number> = {
  watching: 0,
  completed: 1,
  dropped: 2,
  wishlist: 3,
};

export function sortMediaItems(media: readonly MediaItem[]) {
  return [...media].sort((left, right) => {
    const statusDifference = statusOrder[left.details.status] - statusOrder[right.details.status];
    if (statusDifference) return statusDifference;
    if (left.details.rating !== undefined && right.details.rating !== undefined && left.details.rating !== right.details.rating) {
      return right.details.rating - left.details.rating;
    }
    if (left.details.rating !== undefined && right.details.rating === undefined) return -1;
    if (left.details.rating === undefined && right.details.rating !== undefined) return 1;
    return left.item.title.localeCompare(right.item.title, undefined, { sensitivity: "base" });
  });
}

export function mediaProgressLabel(details: Pick<MediaDetails, "type" | "currentSeason" | "currentEpisode">) {
  if (details.type !== "series") return "";
  if (details.currentSeason && details.currentEpisode) return `S${details.currentSeason} · E${details.currentEpisode}`;
  if (details.currentSeason) return `Season ${details.currentSeason}`;
  if (details.currentEpisode) return `Episode ${details.currentEpisode}`;
  return "";
}
