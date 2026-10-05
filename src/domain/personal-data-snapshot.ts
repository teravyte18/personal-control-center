import {
  defaultExpenseSettings,
  emptyExpenseReconciliation,
  expenseBucketIds,
  normalizeExpenseReconciliation,
  normalizeExpenseSettings,
  normalizeExpenseTransaction,
  normalizeExpenseTransactions,
  normalizeExpenseTransactionUpdates,
  validExpenseDate,
  type ExpenseReconciliation,
  type ExpenseSettings,
  type ExpenseTransaction,
  type ExpenseTransactionUpdates,
} from "./expenses.ts";
import {
  areaIds,
  archiveItem,
  emptyReview,
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
  validDateOnlyOrEmpty,
  type ActionCompletionResolution,
  type Item,
  type ItemStatus,
  type ProjectAction,
  type ProjectActionReschedule,
  type ProjectActionUpdates,
  type ReviewDraft,
  type ReviewEntry,
} from "./personal-data.ts";
import {
  normalizeRhythmCompletion,
  normalizeRhythmCompletions,
  normalizeRhythmTemplate,
  normalizeRhythmTemplates,
  normalizeWeeklyFocus,
  normalizeWeeklyFocuses,
  updateRhythmTemplate,
  type RhythmCompletion,
  type RhythmState,
  type RhythmTemplate,
  type WeeklyFocus,
} from "./weekly-rhythm.ts";

export const PERSONAL_DATA_EXPORT_FORMAT = "personal-control-center";
export const PERSONAL_DATA_EXPORT_VERSION = 1;

export type PersonalDataSnapshot = {
  items: Item[];
  draft: ReviewDraft;
  history: ReviewEntry[];
  expenseTransactions: ExpenseTransaction[];
  expenseSettings: ExpenseSettings;
  expenseReconciliation: ExpenseReconciliation;
  rhythmTemplates: RhythmTemplate[];
  rhythmCompletions: RhythmCompletion[];
  weeklyFocuses: WeeklyFocus[];
};

export type PersonalDataExport = {
  format: typeof PERSONAL_DATA_EXPORT_FORMAT;
  version: typeof PERSONAL_DATA_EXPORT_VERSION;
  exportedAt: string;
  data: PersonalDataSnapshot;
};

type ItemUpdates = Partial<Omit<Item, "id" | "createdAt">>;

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
  | { type: "complete-review"; entry: ReviewEntry }
  | { type: "add-expense-transaction"; transaction: ExpenseTransaction }
  | {
    type: "update-expense-transaction";
    id: string;
    updates: ExpenseTransactionUpdates;
    occurredAt: string;
  }
  | { type: "delete-expense-transaction"; id: string }
  | { type: "update-expense-settings"; settings: ExpenseSettings }
  | { type: "set-expense-reconciled-through"; date: string }
  | { type: "add-rhythm-template"; template: RhythmTemplate }
  | {
    type: "update-rhythm-template";
    id: string;
    updates: Partial<Pick<RhythmTemplate, "title" | "targetPerWeek" | "area" | "preferredDaypart" | "approximateMinutes" | "note" | "state">>;
    occurredAt: string;
  }
  | { type: "delete-rhythm-template"; id: string }
  | { type: "add-rhythm-completion"; completion: RhythmCompletion }
  | { type: "delete-rhythm-completion"; id: string }
  | { type: "add-weekly-focus"; focus: WeeklyFocus }
  | { type: "remove-weekly-focus"; id: string };

export const emptyPersonalDataSnapshot: PersonalDataSnapshot = {
  items: [],
  draft: { ...emptyReview },
  history: [],
  expenseTransactions: [],
  expenseSettings: { ...defaultExpenseSettings, targets: { ...defaultExpenseSettings.targets } },
  expenseReconciliation: { ...emptyExpenseReconciliation },
  rhythmTemplates: [],
  rhythmCompletions: [],
  weeklyFocuses: [],
};

const reviewFields = [
  "periodStart",
  "periodEnd",
  "location",
  "photoName",
  "happened",
  "wentWell",
  "difficult",
  "learned",
  "nextWeek",
] as const satisfies readonly (keyof ReviewDraft)[];

const reviewContentFields = [
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

function isDateOnlyOrEmpty(value: unknown): value is string {
  return value === "" || isDateOnly(value);
}

function normalizeReschedule(value: unknown): ProjectActionReschedule | null {
  if (!isRecord(value)
    || !isDateOnlyOrEmpty(value.previousTargetDate)
    || !isDateOnlyOrEmpty(value.targetDate)
    || !isDateTime(value.changedAt)
    || value.previousTargetDate === value.targetDate) return null;
  const note = typeof value.note === "string" ? value.note.trim() : "";
  return {
    previousTargetDate: value.previousTargetDate,
    targetDate: value.targetDate,
    changedAt: value.changedAt,
    note: note || undefined,
  };
}

function normalizeAction(value: unknown): ProjectAction | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.title !== "string"
    || !isDateOnlyOrEmpty(value.targetDate)
    || !isDateTime(value.openedAt)
    || !isDateTime(value.updatedAt)) return null;

  const title = value.title.trim();
  if (!title) return null;
  const details = typeof value.details === "string" ? value.details.trim() : "";

  const completedAt = value.completedAt === undefined
    ? undefined
    : isDateTime(value.completedAt) ? value.completedAt : null;
  if (completedAt === null) return null;
  const reschedules = Array.isArray(value.reschedules)
    ? value.reschedules.flatMap((candidate): ProjectActionReschedule[] => {
      const reschedule = normalizeReschedule(candidate);
      return reschedule ? [reschedule] : [];
    })
    : [];

  return {
    id: value.id,
    title,
    targetDate: value.targetDate,
    details: details || undefined,
    openedAt: value.openedAt,
    updatedAt: value.updatedAt,
    completedAt,
    completionNote: completedAt && typeof value.completionNote === "string"
      ? value.completionNote
      : undefined,
    reschedules: reschedules.length ? reschedules : undefined,
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
  if ("checkInDate" in value) {
    if (typeof value.checkInDate !== "string") return null;
    const normalized = validDateOnlyOrEmpty(value.checkInDate);
    if (value.checkInDate && !normalized) return null;
    updates.checkInDate = normalized || undefined;
  }
  if ("projectTakeaways" in value) {
    if (value.projectTakeaways !== undefined && typeof value.projectTakeaways !== "string") return null;
    updates.projectTakeaways = typeof value.projectTakeaways === "string"
      ? value.projectTakeaways.trim() || undefined
      : undefined;
  }

  return updates;
}

function normalizeProjectActionUpdates(value: unknown): ProjectActionUpdates | null {
  if (!isRecord(value)
    || typeof value.title !== "string"
    || !value.title.trim()
    || !isDateOnlyOrEmpty(value.targetDate)) return null;
  if (value.details !== undefined && typeof value.details !== "string") return null;
  if (value.rescheduleNote !== undefined && typeof value.rescheduleNote !== "string") return null;
  return {
    title: value.title,
    targetDate: value.targetDate,
    details: typeof value.details === "string" ? value.details : undefined,
    rescheduleNote: typeof value.rescheduleNote === "string" ? value.rescheduleNote : undefined,
  };
}

function normalizeExpenseSettingsMutation(value: unknown): ExpenseSettings | null {
  if (!isRecord(value) || value.currency !== "EUR" || !isRecord(value.targets)) return null;
  const targetRecord = value.targets;
  const values = expenseBucketIds.map((bucket) => targetRecord[bucket]);
  if (values.some((candidate) => typeof candidate !== "number"
    || !Number.isFinite(candidate)
    || candidate < 0
    || candidate > 100)) return null;
  const total = values.reduce<number>((sum, candidate) => sum + (candidate as number), 0);
  if (Math.abs(total - 100) > 0.001) return null;
  return normalizeExpenseSettings(value);
}

export function normalizePersonalDataSnapshot(value: unknown): PersonalDataSnapshot {
  if (!isRecord(value)) return {
    ...emptyPersonalDataSnapshot,
    draft: { ...emptyReview },
    expenseSettings: { ...defaultExpenseSettings, targets: { ...defaultExpenseSettings.targets } },
    expenseReconciliation: { ...emptyExpenseReconciliation },
  };
  return {
    items: normalizeItems(value.items),
    draft: normalizeReviewDraft(value.draft),
    history: normalizeReviewHistory(value.history),
    expenseTransactions: normalizeExpenseTransactions(value.expenseTransactions),
    expenseSettings: normalizeExpenseSettings(value.expenseSettings),
    expenseReconciliation: normalizeExpenseReconciliation(value.expenseReconciliation),
    rhythmTemplates: normalizeRhythmTemplates(value.rhythmTemplates),
    rhythmCompletions: normalizeRhythmCompletions(value.rhythmCompletions),
    weeklyFocuses: normalizeWeeklyFocuses(value.weeklyFocuses),
  };
}

export function hasPersonalData(snapshot: PersonalDataSnapshot) {
  const customizedExpenseTargets = expenseBucketIds.some(
    (bucket) => snapshot.expenseSettings.targets[bucket] !== defaultExpenseSettings.targets[bucket],
  );
  return snapshot.items.length > 0
    || snapshot.history.length > 0
    || snapshot.expenseTransactions.length > 0
    || snapshot.expenseReconciliation.reconciledThrough.length > 0
    || snapshot.rhythmTemplates.length > 0
    || snapshot.rhythmCompletions.length > 0
    || snapshot.weeklyFocuses.length > 0
    || customizedExpenseTargets
    || reviewContentFields.some((field) => snapshot.draft[field].trim().length > 0);
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
    const updates = normalizeProjectActionUpdates(value.updates);
    return typeof value.projectId === "string"
      && typeof value.actionId === "string"
      && updates
      && isDateTime(value.occurredAt)
      ? {
        type: "update-project-action",
        projectId: value.projectId,
        actionId: value.actionId,
        updates,
        occurredAt: value.occurredAt,
      }
      : null;
  }

  if (value.type === "complete-project-action") {
    const resolutions: ActionCompletionResolution[] = ["keep-active", "next-action", "waiting", "complete-project"];
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

  if (value.type === "add-expense-transaction") {
    const transaction = normalizeExpenseTransaction(value.transaction);
    return transaction ? { type: "add-expense-transaction", transaction } : null;
  }

  if (value.type === "update-expense-transaction") {
    const updates = normalizeExpenseTransactionUpdates(value.updates);
    return typeof value.id === "string" && updates && isDateTime(value.occurredAt)
      ? { type: "update-expense-transaction", id: value.id, updates, occurredAt: value.occurredAt }
      : null;
  }

  if (value.type === "delete-expense-transaction") {
    return typeof value.id === "string" ? { type: "delete-expense-transaction", id: value.id } : null;
  }

  if (value.type === "update-expense-settings") {
    const settings = normalizeExpenseSettingsMutation(value.settings);
    return settings ? { type: "update-expense-settings", settings } : null;
  }

  if (value.type === "set-expense-reconciled-through") {
    return typeof value.date === "string" && (value.date === "" || validExpenseDate(value.date))
      ? { type: "set-expense-reconciled-through", date: value.date }
      : null;
  }

  if (value.type === "add-rhythm-template") {
    const template = normalizeRhythmTemplate(value.template);
    return template ? { type: "add-rhythm-template", template } : null;
  }

  if (value.type === "update-rhythm-template") {
    if (typeof value.id !== "string" || !isDateTime(value.occurredAt) || !isRecord(value.updates)) return null;
    const updates: Partial<Pick<RhythmTemplate, "title" | "targetPerWeek" | "area" | "preferredDaypart" | "approximateMinutes" | "note" | "state">> = {};
    if ("title" in value.updates) {
      if (typeof value.updates.title !== "string" || !value.updates.title.trim()) return null;
      updates.title = value.updates.title;
    }
    if ("targetPerWeek" in value.updates) {
      if (typeof value.updates.targetPerWeek !== "number") return null;
      updates.targetPerWeek = value.updates.targetPerWeek;
    }
    if ("area" in value.updates) {
      if (value.updates.area !== undefined && (typeof value.updates.area !== "string" || !areaIds.includes(value.updates.area as Item["area"]))) return null;
      updates.area = value.updates.area as Item["area"] | undefined;
    }
    if ("preferredDaypart" in value.updates) {
      if (value.updates.preferredDaypart !== undefined && !["morning", "afternoon", "evening"].includes(String(value.updates.preferredDaypart))) return null;
      updates.preferredDaypart = value.updates.preferredDaypart as RhythmTemplate["preferredDaypart"];
    }
    if ("approximateMinutes" in value.updates) {
      if (value.updates.approximateMinutes !== undefined && typeof value.updates.approximateMinutes !== "number") return null;
      updates.approximateMinutes = value.updates.approximateMinutes as number | undefined;
    }
    if ("note" in value.updates) {
      if (value.updates.note !== undefined && typeof value.updates.note !== "string") return null;
      updates.note = value.updates.note as string | undefined;
    }
    if ("state" in value.updates) {
      if (typeof value.updates.state !== "string" || !["active", "paused"].includes(value.updates.state)) return null;
      updates.state = value.updates.state as RhythmState;
    }
    return { type: "update-rhythm-template", id: value.id, updates, occurredAt: value.occurredAt };
  }

  if (value.type === "delete-rhythm-template") {
    return typeof value.id === "string" ? { type: "delete-rhythm-template", id: value.id } : null;
  }

  if (value.type === "add-rhythm-completion") {
    const completion = normalizeRhythmCompletion(value.completion);
    return completion ? { type: "add-rhythm-completion", completion } : null;
  }

  if (value.type === "delete-rhythm-completion") {
    return typeof value.id === "string" ? { type: "delete-rhythm-completion", id: value.id } : null;
  }

  if (value.type === "add-weekly-focus") {
    const focus = normalizeWeeklyFocus(value.focus);
    return focus ? { type: "add-weekly-focus", focus } : null;
  }

  if (value.type === "remove-weekly-focus") {
    return typeof value.id === "string" ? { type: "remove-weekly-focus", id: value.id } : null;
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

  if (mutation.type === "add-expense-transaction") {
    return snapshot.expenseTransactions.some((transaction) => transaction.id === mutation.transaction.id)
      ? snapshot
      : {
        ...snapshot,
        expenseTransactions: normalizeExpenseTransactions([
          mutation.transaction,
          ...snapshot.expenseTransactions,
        ]),
      };
  }

  if (mutation.type === "update-expense-transaction") {
    return {
      ...snapshot,
      expenseTransactions: normalizeExpenseTransactions(snapshot.expenseTransactions.map((transaction) => (
        transaction.id === mutation.id
          ? { ...transaction, ...mutation.updates, updatedAt: mutation.occurredAt }
          : transaction
      ))),
    };
  }

  if (mutation.type === "delete-expense-transaction") {
    return {
      ...snapshot,
      expenseTransactions: snapshot.expenseTransactions.filter((transaction) => transaction.id !== mutation.id),
    };
  }

  if (mutation.type === "update-expense-settings") {
    return { ...snapshot, expenseSettings: mutation.settings };
  }

  if (mutation.type === "set-expense-reconciled-through") {
    return {
      ...snapshot,
      expenseReconciliation: { reconciledThrough: mutation.date },
    };
  }

  if (mutation.type === "add-rhythm-template") {
    return snapshot.rhythmTemplates.some((template) => template.id === mutation.template.id)
      ? snapshot
      : { ...snapshot, rhythmTemplates: [mutation.template, ...snapshot.rhythmTemplates] };
  }

  if (mutation.type === "update-rhythm-template") {
    return {
      ...snapshot,
      rhythmTemplates: snapshot.rhythmTemplates.map((template) => (
        template.id === mutation.id
          ? updateRhythmTemplate(template, mutation.updates, new Date(mutation.occurredAt))
          : template
      )),
    };
  }

  if (mutation.type === "delete-rhythm-template") {
    return {
      ...snapshot,
      rhythmTemplates: snapshot.rhythmTemplates.filter((template) => template.id !== mutation.id),
      rhythmCompletions: snapshot.rhythmCompletions.filter((completion) => completion.templateId !== mutation.id),
    };
  }

  if (mutation.type === "add-rhythm-completion") {
    const templateExists = snapshot.rhythmTemplates.some((template) => template.id === mutation.completion.templateId);
    if (!templateExists || snapshot.rhythmCompletions.some((completion) => completion.id === mutation.completion.id)) return snapshot;
    return { ...snapshot, rhythmCompletions: [mutation.completion, ...snapshot.rhythmCompletions] };
  }

  if (mutation.type === "delete-rhythm-completion") {
    return {
      ...snapshot,
      rhythmCompletions: snapshot.rhythmCompletions.filter((completion) => completion.id !== mutation.id),
    };
  }

  if (mutation.type === "add-weekly-focus") {
    const duplicate = snapshot.weeklyFocuses.some((focus) => (
      focus.weekStart === mutation.focus.weekStart
      && focus.sourceType === mutation.focus.sourceType
      && focus.sourceItemId === mutation.focus.sourceItemId
      && focus.sourceActionId === mutation.focus.sourceActionId
    ));
    return duplicate ? snapshot : { ...snapshot, weeklyFocuses: [mutation.focus, ...snapshot.weeklyFocuses] };
  }

  if (mutation.type === "remove-weekly-focus") {
    return {
      ...snapshot,
      weeklyFocuses: snapshot.weeklyFocuses.filter((focus) => focus.id !== mutation.id),
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
      if (item.kind !== "project") return [item];
      return [{
        ...item,
        actions: [mutation.action, ...item.actions],
        status: item.status === "waiting" ? "active" : item.status,
        updatedAt: mutation.action.openedAt,
      }];
    }

    if (mutation.type === "update-project-action") {
      return [updateProjectAction(item, mutation.actionId, mutation.updates, now)];
    }

    if (mutation.type === "complete-project-action") {
      const targetAction = item.actions.find((action) => action.id === mutation.actionId && !action.completedAt);
      if (!targetAction) return [item];
      const hasOtherOpenActions = item.actions.some((action) => action.id !== mutation.actionId && !action.completedAt);
      if (mutation.resolution === "keep-active" && !hasOtherOpenActions) return [item];
      if (["waiting", "complete-project"].includes(mutation.resolution) && hasOtherOpenActions) return [item];

      const actions = item.actions.map((action) => {
        if (action.id !== mutation.actionId) return action;
        return {
          ...action,
          completionNote: mutation.completionNote.trim(),
          completedAt: mutation.occurredAt,
          updatedAt: mutation.occurredAt,
        };
      });

      let updatedItem: Item = { ...item, actions, updatedAt: mutation.occurredAt };
      if (mutation.resolution === "next-action" && mutation.nextAction) {
        updatedItem = transitionItemStatus({ ...updatedItem, actions: [mutation.nextAction, ...actions] }, "active", now);
      } else if (mutation.resolution === "keep-active") {
        updatedItem = transitionItemStatus(updatedItem, "active", now);
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