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
export type ArchiveReturnStatus = Exclude<ItemStatus, "archived">;
export type ActionCompletionResolution = "next-action" | "waiting" | "complete-project";

export type ProjectAction = {
  id: string;
  title: string;
  targetDate: string;
  openedAt: string;
  updatedAt: string;
  completedAt?: string;
  completionNote?: string;
};

export type Item = {
  id: string;
  title: string;
  description: string;
  actions: ProjectAction[];
  kind: ItemKind;
  status: ItemStatus;
  area: AreaId;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  statusBeforeCompletion?: RestorableItemStatus;
  archivedAt?: string;
  statusBeforeArchive?: ArchiveReturnStatus;
};

export type ReviewDraft = {
  location: string;
  photoId: string;
  photoName: string;
  photoMimeType: string;
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
  photoId: "",
  photoName: "",
  photoMimeType: "",
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

function isArchiveReturnStatus(value: unknown): value is ArchiveReturnStatus {
  return isItemStatus(value) && value !== "archived";
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function validDateOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function validDateOnlyOrEmpty(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return Number.isNaN(Date.parse(`${value}T00:00:00`)) ? "" : value;
}

function normalizeProjectAction(value: unknown, fallbackTimestamp: string): ProjectAction | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  const title = value.title.trim();
  if (!title) return null;
  const openedAt = validDateOrFallback(value.openedAt, fallbackTimestamp);
  const completedAt = typeof value.completedAt === "string" && !Number.isNaN(Date.parse(value.completedAt))
    ? value.completedAt
    : undefined;

  return {
    id: value.id,
    title,
    targetDate: validDateOnlyOrEmpty(value.targetDate),
    openedAt,
    updatedAt: validDateOrFallback(value.updatedAt, openedAt),
    completedAt,
    completionNote: completedAt ? stringOrEmpty(value.completionNote) : undefined,
  };
}

function normalizeProjectActions(value: unknown, fallbackTimestamp: string) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): ProjectAction[] => {
    const action = normalizeProjectAction(candidate, fallbackTimestamp);
    return action ? [action] : [];
  });
}

export function normalizeItem(value: unknown, fallbackNow = new Date()): Item | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;

  const fallbackTimestamp = fallbackNow.toISOString();
  const createdAt = validDateOrFallback(value.createdAt, fallbackTimestamp);
  const updatedAt = validDateOrFallback(value.updatedAt, createdAt);
  const kind = isItemKind(value.kind) ? value.kind : "unclassified";
  const status = isItemStatus(value.status) ? value.status : "inbox";
  const statusBeforeArchive = status === "archived" && isArchiveReturnStatus(value.statusBeforeArchive)
    ? value.statusBeforeArchive
    : undefined;
  const preservesCompletion = status === "completed" || (status === "archived" && statusBeforeArchive === "completed");
  const completedAt = typeof value.completedAt === "string" && !Number.isNaN(Date.parse(value.completedAt))
    ? value.completedAt
    : undefined;
  let actions = normalizeProjectActions(value.actions, updatedAt);

  const legacyNextAction = stringOrEmpty(value.nextAction).trim();
  if (kind === "project" && actions.length === 0 && legacyNextAction) {
    actions = [{
      id: `${value.id}-migrated-action`,
      title: legacyNextAction,
      targetDate: "",
      openedAt: updatedAt,
      updatedAt,
    }];
  }

  return {
    id: value.id,
    title: value.title,
    description: stringOrEmpty(value.description),
    actions,
    kind,
    status,
    area: isAreaId(value.area) ? value.area : "uncategorized",
    createdAt,
    updatedAt,
    completedAt: preservesCompletion ? completedAt : undefined,
    statusBeforeCompletion: preservesCompletion && isRestorableStatus(value.statusBeforeCompletion)
      ? value.statusBeforeCompletion
      : undefined,
    archivedAt: status === "archived" ? validDateOrFallback(value.archivedAt, updatedAt) : undefined,
    statusBeforeArchive,
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
    photoId: stringOrEmpty(value.photoId),
    photoName: stringOrEmpty(value.photoName),
    photoMimeType: stringOrEmpty(value.photoMimeType),
    happened: stringOrEmpty(value.happened),
    wentWell: stringOrEmpty(value.wentWell),
    difficult: stringOrEmpty(value.difficult),
    learned: stringOrEmpty(value.learned),
    nextWeek: stringOrEmpty(value.nextWeek),
  };
}

export function normalizeReviewHistory(value: unknown): ReviewEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): ReviewEntry[] => {
    if (!isRecord(candidate) || typeof candidate.id !== "string") return [];
    const completedAt = validDateOrFallback(candidate.completedAt, "");
    if (!completedAt) return [];
    return [{
      ...normalizeReviewDraft(candidate),
      id: candidate.id,
      completedAt,
    }];
  });
}

export function createId() {
  return crypto.randomUUID();
}

export function createItem(
  title: string,
  options: Partial<Pick<Item, "description" | "kind" | "status" | "area">> = {},
  now = new Date(),
): Item | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;
  const timestamp = now.toISOString();
  return {
    id: createId(),
    title: trimmedTitle,
    description: options.description?.trim() ?? "",
    actions: [],
    kind: options.kind ?? "unclassified",
    status: options.status ?? "inbox",
    area: options.area ?? "uncategorized",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
