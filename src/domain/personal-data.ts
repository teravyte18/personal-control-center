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
export type ActionCompletionResolution = "keep-active" | "next-action" | "waiting" | "complete-project";

export type ProjectActionReschedule = {
  previousTargetDate: string;
  targetDate: string;
  changedAt: string;
  note?: string;
};

export type ProjectAction = {
  id: string;
  title: string;
  targetDate: string;
  openedAt: string;
  updatedAt: string;
  completedAt?: string;
  completionNote?: string;
  reschedules?: ProjectActionReschedule[];
};

export type ProjectActionUpdates = Pick<ProjectAction, "title" | "targetDate"> & {
  rescheduleNote?: string;
};

export type Item = {
  id: string;
  title: string;
  description: string;
  actions: ProjectAction[];
  kind: ItemKind;
  status: ItemStatus;
  area: AreaId;
  checkInDate?: string;
  projectTakeaways?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  statusBeforeCompletion?: RestorableItemStatus;
  archivedAt?: string;
  statusBeforeArchive?: ArchiveReturnStatus;
};

export type ReviewDraft = {
  periodStart: string;
  periodEnd: string;
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
  periodStart: "",
  periodEnd: "",
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

function isArchiveReturnStatus(value: unknown): value is ArchiveReturnStatus {
  return isItemStatus(value) && value !== "archived";
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function validDateOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

export function validDateOnlyOrEmpty(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return Number.isNaN(Date.parse(`${value}T00:00:00`)) ? "" : value;
}

function normalizeOptionalDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value) return "";
  return validDateOnlyOrEmpty(value) || null;
}

function normalizeProjectActionReschedules(value: unknown): ProjectActionReschedule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): ProjectActionReschedule[] => {
    if (!isRecord(candidate)) return [];
    const previousTargetDate = normalizeOptionalDateOnly(candidate.previousTargetDate);
    const targetDate = normalizeOptionalDateOnly(candidate.targetDate);
    if (previousTargetDate === null || targetDate === null) return [];
    if (previousTargetDate === targetDate) return [];
    if (typeof candidate.changedAt !== "string" || Number.isNaN(Date.parse(candidate.changedAt))) return [];
    const note = stringOrEmpty(candidate.note).trim();
    return [{
      previousTargetDate,
      targetDate,
      changedAt: candidate.changedAt,
      note: note || undefined,
    }];
  });
}

function normalizeProjectAction(value: unknown, fallbackTimestamp: string): ProjectAction | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  const title = value.title.trim();
  if (!title) return null;
  const targetDate = normalizeOptionalDateOnly(value.targetDate);
  if (targetDate === null) return null;
  const openedAt = validDateOrFallback(value.openedAt, fallbackTimestamp);
  const completedAt = typeof value.completedAt === "string" && !Number.isNaN(Date.parse(value.completedAt))
    ? value.completedAt
    : undefined;
  const reschedules = normalizeProjectActionReschedules(value.reschedules);

  return {
    id: value.id,
    title,
    targetDate,
    openedAt,
    updatedAt: validDateOrFallback(value.updatedAt, openedAt),
    completedAt,
    completionNote: completedAt ? stringOrEmpty(value.completionNote) : undefined,
    reschedules: reschedules.length ? reschedules : undefined,
  };
}

function normalizeProjectActions(value: unknown, fallbackTimestamp: string) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): ProjectAction[] => {
    const action = normalizeProjectAction(candidate, fallbackTimestamp);
    return action ? [action] : [];
  });
}

function normalizeProjectWorkflowStatus(kind: ItemKind, status: ItemStatus, actions: ProjectAction[]): ItemStatus {
  if (kind !== "project" || !["active", "in-progress", "waiting"].includes(status)) return status;
  const hasOpenActions = actions.some((action) => !action.completedAt);
  if (!hasOpenActions) return "waiting";
  return status === "waiting" ? "active" : status;
}

export function normalizeItem(value: unknown, fallbackNow = new Date()): Item | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;

  const fallbackTimestamp = fallbackNow.toISOString();
  const createdAt = validDateOrFallback(value.createdAt, fallbackTimestamp);
  const updatedAt = validDateOrFallback(value.updatedAt, createdAt);
  const kind = isItemKind(value.kind) ? value.kind : "unclassified";
  const rawStatus = isItemStatus(value.status) ? value.status : "inbox";
  const statusBeforeArchive = rawStatus === "archived" && isArchiveReturnStatus(value.statusBeforeArchive)
    ? value.statusBeforeArchive
    : undefined;
  const preservesCompletion = rawStatus === "completed" || (rawStatus === "archived" && statusBeforeArchive === "completed");
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

  const status = normalizeProjectWorkflowStatus(kind, rawStatus, actions);
  const projectTakeaways = stringOrEmpty(value.projectTakeaways).trim();

  return {
    id: value.id,
    title: value.title,
    description: stringOrEmpty(value.description),
    actions,
    kind,
    status,
    area: isAreaId(value.area) ? value.area : "uncategorized",
    checkInDate: validDateOnlyOrEmpty(value.checkInDate) || undefined,
    projectTakeaways: projectTakeaways || undefined,
    createdAt,
    updatedAt,
    completedAt: preservesCompletion ? completedAt : undefined,
    statusBeforeCompletion: preservesCompletion && isRestorableStatus(value.statusBeforeCompletion)
      ? value.statusBeforeCompletion
      : undefined,
    archivedAt: rawStatus === "archived" ? validDateOrFallback(value.archivedAt, updatedAt) : undefined,
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
    periodStart: validDateOnlyOrEmpty(value.periodStart),
    periodEnd: validDateOnlyOrEmpty(value.periodEnd),
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
    if (!isRecord(candidate) || typeof candidate.id !== "string" || typeof candidate.completedAt !== "string") return [];
    if (Number.isNaN(Date.parse(candidate.completedAt))) return [];
    return [{
      ...normalizeReviewDraft(candidate),
      id: candidate.id,
      completedAt: candidate.completedAt,
    }];
  });
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();

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
  options: Partial<Pick<Item, "description" | "kind" | "status" | "area" | "checkInDate">> = {},
  now = new Date(),
): Item | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const timestamp = now.toISOString();
  return {
    id: createId(),
    title: trimmedTitle,
    description: options.description ?? "",
    actions: [],
    kind: options.kind ?? "unclassified",
    status: options.status ?? "inbox",
    area: options.area ?? "uncategorized",
    checkInDate: validDateOnlyOrEmpty(options.checkInDate) || undefined,
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
    checkInDate: "checkInDate" in updates ? validDateOnlyOrEmpty(updates.checkInDate) || undefined : item.checkInDate,
    projectTakeaways: "projectTakeaways" in updates
      ? updates.projectTakeaways?.trim() || undefined
      : item.projectTakeaways,
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: now.toISOString(),
  };
}

export function archiveItem(item: Item, now = new Date()): Item {
  if (item.status === "archived") return item;
  const timestamp = now.toISOString();
  return {
    ...item,
    status: "archived",
    statusBeforeArchive: item.status,
    archivedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function restoreArchivedItem(item: Item, now = new Date()): Item {
  if (item.status !== "archived") return item;
  const timestamp = now.toISOString();
  const restoredStatus = item.statusBeforeArchive ?? "active";
  const {
    archivedAt: _archivedAt,
    statusBeforeArchive: _statusBeforeArchive,
    ...withoutArchiveMetadata
  } = item;

  if (restoredStatus === "completed") {
    return {
      ...withoutArchiveMetadata,
      status: "completed",
      updatedAt: timestamp,
    };
  }

  const {
    completedAt: _completedAt,
    statusBeforeCompletion: _statusBeforeCompletion,
    ...restored
  } = withoutArchiveMetadata;
  return transitionItemStatus({
    ...restored,
    status: restoredStatus,
    updatedAt: timestamp,
  }, restoredStatus, now);
}

export function transitionItemStatus(item: Item, requestedStatus: ItemStatus, now = new Date()): Item {
  if (requestedStatus === "archived") return archiveItem(item, now);
  const nextStatus = normalizeProjectWorkflowStatus(item.kind, requestedStatus, item.actions);
  if (item.status === nextStatus) return item;
  const timestamp = now.toISOString();

  if (nextStatus === "completed") {
    const previousStatus: RestorableItemStatus = item.status === "completed"
      ? item.statusBeforeCompletion ?? "active"
      : item.status === "archived"
        ? "active"
        : item.status;
    const {
      archivedAt: _archivedAt,
      statusBeforeArchive: _statusBeforeArchive,
      ...rest
    } = item;
    return {
      ...rest,
      status: "completed",
      statusBeforeCompletion: previousStatus,
      completedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  const {
    statusBeforeCompletion: _previousStatus,
    completedAt: _completedAt,
    archivedAt: _archivedAt,
    statusBeforeArchive: _statusBeforeArchive,
    ...rest
  } = item;
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

export function isOpenTask(item: Item) {
  return item.kind === "task" && !["completed", "archived"].includes(item.status);
}

export function isTaskDueToday(item: Item, reference = new Date()) {
  const checkInDate = item.checkInDate ?? "";
  if (!isOpenTask(item) || !checkInDate) return false;
  return checkInDate === formatLocalDate(reference);
}

export function isTaskOverdue(item: Item, reference = new Date()) {
  const checkInDate = item.checkInDate ?? "";
  if (!isOpenTask(item) || !checkInDate) return false;
  return checkInDate < formatLocalDate(reference);
}

export function createProjectAction(title: string, targetDate = "", now = new Date()): ProjectAction | null {
  const trimmedTitle = title.trim();
  const normalizedDate = validDateOnlyOrEmpty(targetDate);
  if (!trimmedTitle || (targetDate && !normalizedDate)) return null;
  const timestamp = now.toISOString();
  return {
    id: createId(),
    title: trimmedTitle,
    targetDate: normalizedDate,
    openedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getOpenProjectActions(item: Item) {
  return [...item.actions]
    .filter((action) => !action.completedAt)
    .sort((left, right) => {
      if (!left.targetDate && right.targetDate) return 1;
      if (left.targetDate && !right.targetDate) return -1;
      const byDate = left.targetDate.localeCompare(right.targetDate);
      return byDate || Date.parse(left.openedAt) - Date.parse(right.openedAt);
    });
}

export function getCurrentProjectAction(item: Item) {
  return getOpenProjectActions(item)[0];
}

export function getCompletedProjectActions(item: Item) {
  return [...item.actions]
    .filter((action) => Boolean(action.completedAt))
    .sort((a, b) => Date.parse(b.completedAt ?? b.updatedAt) - Date.parse(a.completedAt ?? a.updatedAt));
}

export function addProjectAction(item: Item, title: string, targetDate = "", now = new Date()): Item {
  if (item.kind !== "project") return item;
  const action = createProjectAction(title, targetDate, now);
  if (!action) return item;
  return {
    ...item,
    actions: [action, ...item.actions],
    status: item.status === "waiting" ? "active" : item.status,
    updatedAt: now.toISOString(),
  };
}

export function updateProjectAction(
  item: Item,
  actionId: string,
  updates: ProjectActionUpdates,
  now = new Date(),
): Item {
  const title = updates.title.trim();
  const targetDate = validDateOnlyOrEmpty(updates.targetDate);
  if (!title || (updates.targetDate && !targetDate)) return item;
  const timestamp = now.toISOString();
  let changed = false;
  const actions = item.actions.map((action) => {
    if (action.id !== actionId || action.completedAt) return action;
    if (action.title === title && action.targetDate === targetDate) return action;
    changed = true;
    const dateChanged = action.targetDate !== targetDate;
    const note = updates.rescheduleNote?.trim();
    return {
      ...action,
      title,
      targetDate,
      updatedAt: timestamp,
      reschedules: dateChanged
        ? [
          ...(action.reschedules ?? []),
          {
            previousTargetDate: action.targetDate,
            targetDate,
            changedAt: timestamp,
            note: note || undefined,
          },
        ]
        : action.reschedules,
    };
  });
  return changed ? { ...item, actions, updatedAt: timestamp } : item;
}

export function completeProjectAction(
  item: Item,
  actionId: string,
  completionNote: string,
  resolution: ActionCompletionResolution,
  nextActionTitle = "",
  nextTargetDate = "",
  now = new Date(),
): Item {
  const action = item.actions.find((candidate) => candidate.id === actionId && !candidate.completedAt);
  if (!action) return item;
  const hasOtherOpenActions = item.actions.some((candidate) => candidate.id !== actionId && !candidate.completedAt);
  if (resolution === "keep-active" && !hasOtherOpenActions) return item;
  if (["waiting", "complete-project"].includes(resolution) && hasOtherOpenActions) return item;
  if (resolution === "next-action" && !createProjectAction(nextActionTitle, nextTargetDate, now)) return item;

  const timestamp = now.toISOString();
  const actions = item.actions.map((candidate) => (
    candidate.id === actionId
      ? {
        ...candidate,
        completionNote: completionNote.trim(),
        completedAt: timestamp,
        updatedAt: timestamp,
      }
      : candidate
  ));

  let updatedItem: Item = { ...item, actions, updatedAt: timestamp };
  if (resolution === "next-action") {
    const nextAction = createProjectAction(nextActionTitle, nextTargetDate, now);
    if (nextAction) {
      updatedItem = transitionItemStatus({ ...updatedItem, actions: [nextAction, ...actions] }, "active", now);
    }
  } else if (resolution === "keep-active") {
    updatedItem = transitionItemStatus(updatedItem, "active", now);
  } else if (resolution === "waiting") {
    updatedItem = transitionItemStatus(updatedItem, "waiting", now);
  } else if (resolution === "complete-project") {
    updatedItem = transitionItemStatus(updatedItem, "completed", now);
  }
  return updatedItem;
}

export function projectRequiresNextAction(item: Item) {
  return item.kind === "project" && ["active", "in-progress"].includes(item.status);
}

export function projectHasNextAction(item: Item) {
  return !projectRequiresNextAction(item) || getOpenProjectActions(item).length > 0;
}

export function projectActionNeedsDate(_item: Item) {
  return false;
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

export function isProjectActionOpenedThisWeek(action: ProjectAction, reference = new Date()) {
  return new Date(action.openedAt) >= startOfWeek(reference);
}

export function isProjectActionCompletedThisWeek(action: ProjectAction, reference = new Date()) {
  return Boolean(action.completedAt && new Date(action.completedAt) >= startOfWeek(reference));
}

export function isProjectActionTargetReached(action: ProjectAction, reference = new Date()) {
  if (action.completedAt || !action.targetDate) return false;
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${action.targetDate}T00:00:00`);
  return target <= today;
}

function formatLocalDate(reference: Date) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
