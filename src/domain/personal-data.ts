export const itemStatuses = [
  "inbox",
  "active",
  "in-progress",
  "waiting",
  "incubating",
  "completed",
  "archived",
] as const;

export type ItemStatus = (typeof itemStatuses)[number];

export const itemKinds = ["unclassified", "project", "task", "thought", "note"] as const;
export type ItemKind = (typeof itemKinds)[number];

export const areaIds = ["work", "education", "personal", "uncategorized"] as const;
export type AreaId = (typeof areaIds)[number];

export type RestorableItemStatus = Exclude<ItemStatus, "completed">;

export type Item = {
  id: string;
  title: string;
  description: string;
  nextAction: string;
  kind: ItemKind;
  status: ItemStatus;
  area: AreaId;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  statusBeforeCompletion?: RestorableItemStatus;
};

export type ReviewDraft = {
  location: string;
  photoName: string;
  happened: string;
  wentWell: string;
  difficult: string;
  learned: string;
  nextWeek: string;
};

export type ReviewEntry = ReviewDraft & {
  id: string;
  completedAt: string;
};

export const emptyReview: ReviewDraft = {
  location: "",
  photoName: "",
  happened: "",
  wentWell: "",
  difficult: "",
  learned: "",
  nextWeek: "",
};

export const areaLabels: Record<AreaId, string> = {
  work: "Work",
  education: "Education",
  personal: "Personal",
  uncategorized: "Uncategorised",
};

export const kindLabels: Record<ItemKind, string> = {
  unclassified: "Unclassified",
  project: "Project",
  task: "Task",
  thought: "Thought",
  note: "Note",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === "string" && itemStatuses.includes(value as ItemStatus);
}

function isItemKind(value: unknown): value is ItemKind {
  return typeof value === "string" && itemKinds.includes(value as ItemKind);
}

function isAreaId(value: unknown): value is AreaId {
  return typeof value === "string" && areaIds.includes(value as AreaId);
}

function isRestorableStatus(value: unknown): value is RestorableItemStatus {
  return isItemStatus(value) && value !== "completed";
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function validDateOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

export function normalizeItem(value: unknown, fallbackNow = new Date()): Item | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }

  const fallbackTimestamp = fallbackNow.toISOString();
  const createdAt = validDateOrFallback(value.createdAt, fallbackTimestamp);
  const status = isItemStatus(value.status) ? value.status : "inbox";
  const completedAt = typeof value.completedAt === "string" && !Number.isNaN(Date.parse(value.completedAt))
    ? value.completedAt
    : undefined;

  return {
    id: value.id,
    title: value.title,
    description: stringOrEmpty(value.description),
    nextAction: stringOrEmpty(value.nextAction),
    kind: isItemKind(value.kind) ? value.kind : "unclassified",
    status,
    area: isAreaId(value.area) ? value.area : "uncategorized",
    createdAt,
    updatedAt: validDateOrFallback(value.updatedAt, createdAt),
    completedAt: status === "completed" ? completedAt : undefined,
    statusBeforeCompletion: status === "completed" && isRestorableStatus(value.statusBeforeCompletion)
      ? value.statusBeforeCompletion
      : undefined,
  };
}

export function normalizeItems(value: unknown, fallbackNow = new Date()) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const item = normalizeItem(candidate, fallbackNow);
    return item ? [item] : [];
  });
}

export function normalizeReviewDraft(value: unknown): ReviewDraft {
  if (!isRecord(value)) return { ...emptyReview };
  return {
    location: stringOrEmpty(value.location),
    photoName: stringOrEmpty(value.photoName),
    happened: stringOrEmpty(value.happened),
    wentWell: stringOrEmpty(value.wentWell),
    difficult: stringOrEmpty(value.difficult),
    learned: stringOrEmpty(value.learned),
    nextWeek: stringOrEmpty(value.nextWeek),
  };
}

export function normalizeReviewHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): ReviewEntry[] => {
    if (!isRecord(candidate) || typeof candidate.id !== "string" || typeof candidate.completedAt !== "string") {
      return [];
    }
    if (Number.isNaN(Date.parse(candidate.completedAt))) return [];
    return [{
      ...normalizeReviewDraft(candidate),
      id: candidate.id,
      completedAt: candidate.completedAt,
    }];
  });
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createItem(
  title: string,
  options: Partial<Pick<Item, "description" | "nextAction" | "kind" | "status" | "area">> = {},
  now = new Date(),
): Item | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const timestamp = now.toISOString();
  return {
    id: createId(),
    title: trimmedTitle,
    description: options.description ?? "",
    nextAction: options.nextAction ?? "",
    kind: options.kind ?? "unclassified",
    status: options.status ?? "inbox",
    area: options.area ?? "uncategorized",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateItemFields(
  item: Item,
  updates: Partial<Omit<Item, "id" | "createdAt">>,
  now = new Date(),
): Item {
  return {
    ...item,
    ...updates,
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: now.toISOString(),
  };
}

export function transitionItemStatus(item: Item, nextStatus: ItemStatus, now = new Date()): Item {
  if (item.status === nextStatus) return item;
  const timestamp = now.toISOString();

  if (nextStatus === "completed") {
    const previousStatus: RestorableItemStatus = item.status === "completed"
      ? item.statusBeforeCompletion ?? "active"
      : item.status;
    return {
      ...item,
      status: "completed",
      statusBeforeCompletion: previousStatus,
      completedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  const { statusBeforeCompletion: _previousStatus, completedAt: _completedAt, ...rest } = item;
  return {
    ...rest,
    status: nextStatus,
    updatedAt: timestamp,
  };
}

export function toggleItemCompleted(item: Item, now = new Date()): Item {
  const nextStatus = item.status === "completed"
    ? item.statusBeforeCompletion ?? "active"
    : "completed";
  return transitionItemStatus(item, nextStatus, now);
}

export function projectRequiresNextAction(item: Item) {
  return item.kind === "project" && ["active", "in-progress"].includes(item.status);
}

export function projectHasNextAction(item: Item) {
  return !projectRequiresNextAction(item) || Boolean(item.nextAction.trim());
}

export function startOfWeek(reference = new Date()) {
  const start = new Date(reference);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function isCompletedThisWeek(item: Item, reference = new Date()) {
  return Boolean(item.completedAt && new Date(item.completedAt) >= startOfWeek(reference));
}

export function isCreatedThisWeek(item: Item, reference = new Date()) {
  return new Date(item.createdAt) >= startOfWeek(reference);
}
