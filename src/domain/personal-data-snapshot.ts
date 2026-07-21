import {
  areaIds,
  archiveItem,
  emptyReview,
  getCurrentProjectAction,
  itemKinds,
  itemStatuses,
  normalizeItem,
  normalizeItems,
  normalizeReviewDraft,
  normalizeReviewHistory,
  restoreArchivedItem,
  toggleItemCompleted,
  transitionItemStatus,
  updateItemFields,
  updateProjectAction,
  type ActionCompletionResolution,
  type Item,
  type ItemStatus,
  type ProjectAction,
  type ReviewDraft,
  type ReviewEntry,
} from "@/domain/personal-data";

export const PERSONAL_DATA_EXPORT_FORMAT = "personal-control-center";
export const PERSONAL_DATA_EXPORT_VERSION = 1;

export type PersonalDataSnapshot = {
  items: Item[];
  draft: ReviewDraft;
  history: ReviewEntry[];
};

export type PersonalDataExport = {
  format: typeof PERSONAL_DATA_EXPORT_FORMAT;
  version: typeof PERSONAL_DATA_EXPORT_VERSION;
  exportedAt: string;
  data: PersonalDataSnapshot;
};

type ItemUpdates = Partial<Omit<Item, "id" | "createdAt">>;
type ProjectActionUpdates = Pick<ProjectAction, "title" | "targetDate">;

export type PersonalDataMutation =
  | { type: "add-item"; item: Item }
  | { type: "update-item"; id: string; updates: ItemUpdates; occurredAt: string }
  | { type: "set-item-status"; id: string; status: ItemStatus; occurredAt: string }
  | { type: "toggle-completed"; id: string; occurredAt: string }
  | { type: "archive-item"; id: string; occurredAt: string }
  | { type: "restore-archived-item"; id: string; occurredAt: string }
  | { type: "delete-item"; id: string }
  | { type: "add-project-action"; projectId: string; action: ProjectAction }
  | {
    type: "update-project-action";
    projectId: string;
    actionId: string;
    updates: ProjectActionUpdates;
    occurredAt: string;
  }
  | {
    type: "complete-project-action";
    projectId: string;
    actionId: string;
    completionNote: string;
    resolution: ActionCompletionResolution;
    occurredAt: string;
    nextAction?: ProjectAction;
  }
  | { type: "update-review-draft"; field: keyof ReviewDraft; value: string }
  | { type: "complete-review"; entry: ReviewEntry };

export const emptyPersonalDataSnapshot: PersonalDataSnapshot = {
  items: [],
  draft: { ...emptyReview },
  history: [],
};

const reviewFields = [
  "location",
  "photoName",
  "happened",
  "wentWell",
  "difficult",
  "learned",
  "nextWeek",
] as const satisfies readonly (keyof ReviewDraft)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function normalizeAction(value: unknown): ProjectAction | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.title !== "string"
    || !isDateOnly(value.targetDate)
    || !isDateTime(value.openedAt)
    || !isDateTime(value.updatedAt)) return null;

  const title = value.title.trim();
  if (!title) return null;

  const completedAt = value.completedAt === undefined
    ? undefined
    : isDateTime(value.completedAt) ? value.completedAt : null;
  if (completedAt === null) return null;

  return {
    id: value.id,
    title,
    targetDate: value.targetDate,
    openedAt: value.openedAt,
    updatedAt: value.updatedAt,
    completedAt,
    completionNote: completedAt && typeof value.completionNote === "string"
      ? value.completionNote
      : undefined,
  };
}

function normalizeUpdates(value: unknown): ItemUpdates | null {
  if (!isRecord(value)) return null;
  const updates: ItemUpdates = {};

  if ("title" in value) {
    if (typeof value.title !== "string" || !value.title.trim()) return null;
    updates.title = value.title;
  }
  if ("description" in value) {
    if (typeof value.description !== "string") return null;
    updates.description = value.description;
  }
  if ("kind" in value) {
    if (typeof value.kind !== "string" || !itemKinds.includes(value.kind as Item["kind"])) return null;
    updates.kind = value.kind as Item["kind"];
  }
  if ("status" in value) {
    if (typeof value.status !== "string" || !itemStatuses.includes(value.status as ItemStatus)) return null;
    updates.status = value.status as ItemStatus;
  }
  if ("area" in value) {
    if (typeof value.area !== "string" || !areaIds.includes(value.area as Item["area"])) return null;
    updates.area = value.area as Item["area"];
  }

  return updates;
}

export function normalizePersonalDataSnapshot(value: unknown): PersonalDataSnapshot {
  if (!isRecord(value)) return { ...emptyPersonalDataSnapshot, draft: { ...emptyReview } };
  return {
    items: normalizeItems(value.items),
    draft: normalizeReviewDraft(value.draft),
    history: normalizeReviewHistory(value.history),
  };
}

export function hasPersonalData(snapshot: PersonalDataSnapshot) {
  return snapshot.items.length > 0
    || snapshot.history.length > 0
    || reviewFields.some((field) => snapshot.draft[field].trim().length > 0);
}

export function createPersonalDataExport(
  snapshot: PersonalDataSnapshot,
  now = new Date(),
): PersonalDataExport {
  return {
    format: PERSONAL_DATA_EXPORT_FORMAT,
    version: PERSONAL_DATA_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    data: normalizePersonalDataSnapshot(snapshot),
  };
}

export function normalizePersonalDataExport(value: unknown): PersonalDataExport | null {
  if (!isRecord(value)
    || value.format !== PERSONAL_DATA_EXPORT_FORMAT
    || value.version !== PERSONAL_DATA_EXPORT_VERSION
    || !isDateTime(value.exportedAt)) return null;

  return {
    format: PERSONAL_DATA_EXPORT_FORMAT,
    version: PERSONAL_DATA_EXPORT_VERSION,
    exportedAt: value.exportedAt,
    data: normalizePersonalDataSnapshot(value.data),
  };
}

export function normalizePersonalDataMutation(value: unknown): PersonalDataMutation | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;

  if (value.type === "add-item") {
    const item = normalizeItem(value.item);
    return item ? { type: "add-item", item } : null;
  }

  if (value.type === "update-item") {
    const updates = normalizeUpdates(value.updates);
    return typeof value.id === "string" && updates && isDateTime(value.occurredAt)
      ? { type: "update-item", id: value.id, updates, occurredAt: value.occurredAt }
      : null;
  }

  if (value.type === "set-item-status") {
    return typeof value.id === "string"
      && typeof value.status === "string"
      && itemStatuses.includes(value.status as ItemStatus)
      && isDateTime(value.occurredAt)
      ? {
        type: "set-item-status",
        id: value.id,
        status: value.status as ItemStatus,
        occurredAt: value.occurredAt,
      }
      : null;
  }

  if (["toggle-completed", "archive-item", "restore-archived-item"].includes(value.type)) {
    return typeof value.id === "string" && isDateTime(value.occurredAt)
      ? {
        type: value.type as "toggle-completed" | "archive-item" | "restore-archived-item",
        id: value.id,
        occurredAt: value.occurredAt,
      }
      : null;
  }

  if (value.type === "delete-item") {
    return typeof value.id === "string" ? { type: "delete-item", id: value.id } : null;
  }

  if (value.type === "add-project-action") {
    const action = normalizeAction(value.action);
    return typeof value.projectId === "string" && action
      ? { type: "add-project-action", projectId: value.projectId, action }
      : null;
  }

  if (value.type === "update-project-action") {
    if (!isRecord(value.updates)
      || typeof value.updates.title !== "string"
      || !value.updates.title.trim()
      || !isDateOnly(value.updates.targetDate)) return null;
    return typeof value.projectId === "string"
      && typeof value.actionId === "string"
      && isDateTime(value.occurredAt)
      ? {
        type: "update-project-action",
        projectId: value.projectId,
        actionId: value.actionId,
        updates: { title: value.updates.title, targetDate: value.updates.targetDate },
        occurredAt: value.occurredAt,
      }
      : null;
  }

  if (value.type === "complete-project-action") {
    const resolutions: ActionCompletionResolution[] = ["next-action", "waiting", "complete-project"];
    if (typeof value.projectId !== "string"
      || typeof value.actionId !== "string"
      || typeof value.completionNote !== "string"
      || typeof value.resolution !== "string"
      || !resolutions.includes(value.resolution as ActionCompletionResolution)
      || !isDateTime(value.occurredAt)) return null;

    const nextAction = value.nextAction === undefined ? undefined : normalizeAction(value.nextAction);
    if (value.resolution === "next-action" && !nextAction) return null;

    return {
      type: "complete-project-action",
      projectId: value.projectId,
      actionId: value.actionId,
      completionNote: value.completionNote,
      resolution: value.resolution as ActionCompletionResolution,
      occurredAt: value.occurredAt,
      nextAction: nextAction ?? undefined,
    };
  }

  if (value.type === "update-review-draft") {
    return typeof value.field === "string"
      && reviewFields.includes(value.field as keyof ReviewDraft)
      && typeof value.value === "string"
      ? { type: "update-review-draft", field: value.field as keyof ReviewDraft, value: value.value }
      : null;
  }

  if (value.type === "complete-review") {
    const [entry] = normalizeReviewHistory([value.entry]);
    return entry ? { type: "complete-review", entry } : null;
  }

  return null;
}

export function applyPersonalDataMutation(
  snapshot: PersonalDataSnapshot,
  mutation: PersonalDataMutation,
): PersonalDataSnapshot {
  if (mutation.type === "add-item") {
    return snapshot.items.some((item) => item.id === mutation.item.id)
      ? snapshot
      : { ...snapshot, items: [mutation.item, ...snapshot.items] };
  }

  if (mutation.type === "update-review-draft") {
    return { ...snapshot, draft: { ...snapshot.draft, [mutation.field]: mutation.value } };
  }

  if (mutation.type === "complete-review") {
    return snapshot.history.some((entry) => entry.id === mutation.entry.id)
      ? snapshot
      : {
        ...snapshot,
        draft: { ...emptyReview },
        history: [mutation.entry, ...snapshot.history],
      };
  }

  const items = snapshot.items.flatMap((item): Item[] => {
    if (mutation.type === "delete-item") return item.id === mutation.id ? [] : [item];

    const targetId = "id" in mutation ? mutation.id : mutation.projectId;
    if (item.id !== targetId) return [item];

    const now = "occurredAt" in mutation ? new Date(mutation.occurredAt) : new Date();

    if (mutation.type === "update-item") return [updateItemFields(item, mutation.updates, now)];
    if (mutation.type === "set-item-status") return [transitionItemStatus(item, mutation.status, now)];
    if (mutation.type === "toggle-completed") return [toggleItemCompleted(item, now)];
    if (mutation.type === "archive-item") return [archiveItem(item, now)];
    if (mutation.type === "restore-archived-item") return [restoreArchivedItem(item, now)];

    if (mutation.type === "add-project-action") {
      if (item.kind !== "project" || getCurrentProjectAction(item)) return [item];
      return [{ ...item, actions: [mutation.action, ...item.actions], updatedAt: mutation.action.openedAt }];
    }

    if (mutation.type === "update-project-action") {
      return [updateProjectAction(item, mutation.actionId, mutation.updates, now)];
    }

    if (mutation.type === "complete-project-action") {
      let found = false;
      const actions = item.actions.map((action) => {
        if (action.id !== mutation.actionId || action.completedAt) return action;
        found = true;
        return {
          ...action,
          completionNote: mutation.completionNote.trim(),
          completedAt: mutation.occurredAt,
          updatedAt: mutation.occurredAt,
        };
      });
      if (!found) return [item];

      let updatedItem: Item = { ...item, actions, updatedAt: mutation.occurredAt };
      if (mutation.resolution === "next-action" && mutation.nextAction) {
        updatedItem = { ...updatedItem, actions: [mutation.nextAction, ...actions] };
      } else if (mutation.resolution === "waiting") {
        updatedItem = transitionItemStatus(updatedItem, "waiting", now);
      } else if (mutation.resolution === "complete-project") {
        updatedItem = transitionItemStatus(updatedItem, "completed", now);
      }
      return [updatedItem];
    }

    return [item];
  });

  return { ...snapshot, items };
}
