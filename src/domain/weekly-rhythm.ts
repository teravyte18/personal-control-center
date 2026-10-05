import {
  createId,
  validDateOnlyOrEmpty,
  type AreaId,
  type Item,
} from "./personal-data.ts";

export const rhythmDayparts = ["morning", "afternoon", "evening"] as const;
export type RhythmDaypart = (typeof rhythmDayparts)[number];

export const rhythmStates = ["active", "paused"] as const;
export type RhythmState = (typeof rhythmStates)[number];

export type RhythmTemplate = {
  id: string;
  title: string;
  targetPerWeek: number;
  area?: AreaId;
  preferredDaypart?: RhythmDaypart;
  approximateMinutes?: number;
  note?: string;
  state: RhythmState;
  createdAt: string;
  updatedAt: string;
};

export type RhythmCompletion = {
  id: string;
  templateId: string;
  completedAt: string;
  note?: string;
};

export type WeeklyFocusSourceType = "task" | "project-action";

export type WeeklyFocus = {
  id: string;
  weekStart: string;
  sourceType: WeeklyFocusSourceType;
  sourceItemId: string;
  sourceActionId?: string;
  createdAt: string;
};

export type RhythmPeriod = {
  start: string;
  end: string;
};

export type DatedRhythmWork = {
  id: string;
  sourceType: WeeklyFocusSourceType;
  sourceItemId: string;
  sourceActionId?: string;
  title: string;
  context: string;
  date: string;
};

export type ResolvedWeeklyFocus = WeeklyFocus & {
  title: string;
  context: string;
  active: boolean;
};

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null;
}

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeTarget(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const target = Math.floor(value);
  return target >= 1 && target <= 14 ? target : null;
}

function normalizeOptionalMinutes(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const minutes = Math.floor(value);
  return minutes >= 5 && minutes <= 720 ? minutes : null;
}

export function getRhythmPeriod(reference = new Date()): RhythmPeriod {
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  const daysSinceSaturday = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - daysSinceSaturday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start: localDate(start), end: localDate(end) };
}

export function isDateInRhythmPeriod(value: string | undefined, period: RhythmPeriod) {
  return Boolean(value && value >= period.start && value <= period.end);
}

export function isTimestampInRhythmPeriod(value: string | undefined, period: RhythmPeriod) {
  if (!value || Number.isNaN(Date.parse(value))) return false;
  return isDateInRhythmPeriod(localDate(new Date(value)), period);
}

export function createRhythmTemplate(
  title: string,
  targetPerWeek: number,
  options: {
    area?: AreaId;
    preferredDaypart?: RhythmDaypart;
    approximateMinutes?: number;
    note?: string;
  } = {},
  now = new Date(),
): RhythmTemplate | null {
  const trimmedTitle = title.trim();
  const target = normalizeTarget(targetPerWeek);
  const minutes = normalizeOptionalMinutes(options.approximateMinutes);
  if (!trimmedTitle || target === null || minutes === null) return null;

  const timestamp = now.toISOString();
  return {
    id: createId(),
    title: trimmedTitle,
    targetPerWeek: target,
    area: options.area,
    preferredDaypart: options.preferredDaypart,
    approximateMinutes: minutes,
    note: options.note?.trim() || undefined,
    state: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeRhythmTemplate(value: unknown): RhythmTemplate | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.title !== "string"
    || !validDateTime(value.createdAt)
    || !validDateTime(value.updatedAt)) return null;

  const title = value.title.trim();
  const targetPerWeek = normalizeTarget(value.targetPerWeek);
  const approximateMinutes = normalizeOptionalMinutes(value.approximateMinutes);
  if (!title || targetPerWeek === null || approximateMinutes === null) return null;

  const area = value.area;
  const validAreas: AreaId[] = ["work", "education", "personal", "uncategorized"];
  const preferredDaypart = typeof value.preferredDaypart === "string"
    && rhythmDayparts.includes(value.preferredDaypart as RhythmDaypart)
    ? value.preferredDaypart as RhythmDaypart
    : undefined;
  const state = typeof value.state === "string" && rhythmStates.includes(value.state as RhythmState)
    ? value.state as RhythmState
    : "active";
  const note = typeof value.note === "string" ? value.note.trim() : "";

  return {
    id: value.id,
    title,
    targetPerWeek,
    area: typeof area === "string" && validAreas.includes(area as AreaId) ? area as AreaId : undefined,
    preferredDaypart,
    approximateMinutes,
    note: note || undefined,
    state,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function normalizeRhythmTemplates(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate): RhythmTemplate[] => {
    const template = normalizeRhythmTemplate(candidate);
    if (!template || seen.has(template.id)) return [];
    seen.add(template.id);
    return [template];
  });
}

export function normalizeRhythmCompletion(value: unknown): RhythmCompletion | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.templateId !== "string"
    || !validDateTime(value.completedAt)) return null;
  const note = typeof value.note === "string" ? value.note.trim() : "";
  return {
    id: value.id,
    templateId: value.templateId,
    completedAt: value.completedAt,
    note: note || undefined,
  };
}

export function normalizeRhythmCompletions(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate): RhythmCompletion[] => {
    const completion = normalizeRhythmCompletion(candidate);
    if (!completion || seen.has(completion.id)) return [];
    seen.add(completion.id);
    return [completion];
  });
}

export function createRhythmCompletion(templateId: string, now = new Date(), note = ""): RhythmCompletion | null {
  if (!templateId.trim()) return null;
  return {
    id: createId(),
    templateId,
    completedAt: now.toISOString(),
    note: note.trim() || undefined,
  };
}

export function normalizeWeeklyFocus(value: unknown): WeeklyFocus | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.sourceItemId !== "string"
    || typeof value.sourceType !== "string"
    || !["task", "project-action"].includes(value.sourceType)
    || !validDateOnlyOrEmpty(value.weekStart)
    || !value.weekStart
    || !validDateTime(value.createdAt)) return null;

  const sourceActionId = value.sourceType === "project-action"
    ? typeof value.sourceActionId === "string" && value.sourceActionId ? value.sourceActionId : null
    : undefined;
  if (value.sourceType === "project-action" && !sourceActionId) return null;

  return {
    id: value.id,
    weekStart: value.weekStart,
    sourceType: value.sourceType as WeeklyFocusSourceType,
    sourceItemId: value.sourceItemId,
    sourceActionId,
    createdAt: value.createdAt,
  };
}

export function normalizeWeeklyFocuses(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate): WeeklyFocus[] => {
    const focus = normalizeWeeklyFocus(candidate);
    if (!focus || seen.has(focus.id)) return [];
    seen.add(focus.id);
    return [focus];
  });
}

export function createWeeklyFocus(
  sourceType: WeeklyFocusSourceType,
  sourceItemId: string,
  sourceActionId: string | undefined,
  now = new Date(),
): WeeklyFocus | null {
  if (!sourceItemId.trim() || (sourceType === "project-action" && !sourceActionId?.trim())) return null;
  return {
    id: createId(),
    weekStart: getRhythmPeriod(now).start,
    sourceType,
    sourceItemId,
    sourceActionId: sourceType === "project-action" ? sourceActionId : undefined,
    createdAt: now.toISOString(),
  };
}

export function updateRhythmTemplate(
  template: RhythmTemplate,
  updates: Partial<Pick<RhythmTemplate, "title" | "targetPerWeek" | "area" | "preferredDaypart" | "approximateMinutes" | "note" | "state">>,
  now = new Date(),
): RhythmTemplate {
  const title = updates.title === undefined ? template.title : updates.title.trim();
  const target = updates.targetPerWeek === undefined ? template.targetPerWeek : normalizeTarget(updates.targetPerWeek);
  const minutes = updates.approximateMinutes === undefined
    ? template.approximateMinutes
    : normalizeOptionalMinutes(updates.approximateMinutes);

  if (!title || target === null || minutes === null) return template;

  return {
    ...template,
    ...updates,
    title,
    targetPerWeek: target,
    approximateMinutes: minutes,
    note: updates.note === undefined ? template.note : updates.note.trim() || undefined,
    updatedAt: now.toISOString(),
  };
}

export function getRhythmProgress(
  templateId: string,
  completions: readonly RhythmCompletion[],
  period: RhythmPeriod,
) {
  const periodCompletions = completions
    .filter((completion) => completion.templateId === templateId && isTimestampInRhythmPeriod(completion.completedAt, period))
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
  return {
    count: periodCompletions.length,
    completions: periodCompletions,
  };
}

export function getDatedRhythmWork(items: readonly Item[], period: RhythmPeriod): DatedRhythmWork[] {
  const result: DatedRhythmWork[] = [];

  for (const item of items) {
    if (["completed", "archived"].includes(item.status)) continue;

    if (item.kind === "task" && isDateInRhythmPeriod(item.checkInDate, period)) {
      result.push({
        id: `task:${item.id}`,
        sourceType: "task",
        sourceItemId: item.id,
        title: item.title,
        context: "Task",
        date: item.checkInDate ?? "",
      });
      continue;
    }

    if (item.kind !== "project") continue;
    for (const action of item.actions) {
      if (action.completedAt || !isDateInRhythmPeriod(action.targetDate, period)) continue;
      result.push({
        id: `project-action:${item.id}:${action.id}`,
        sourceType: "project-action",
        sourceItemId: item.id,
        sourceActionId: action.id,
        title: action.title,
        context: item.title,
        date: action.targetDate,
      });
    }
  }

  return result.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
}

export function resolveWeeklyFocus(items: readonly Item[], focus: WeeklyFocus): ResolvedWeeklyFocus | null {
  const item = items.find((candidate) => candidate.id === focus.sourceItemId);
  if (!item) return null;

  if (focus.sourceType === "task") {
    return {
      ...focus,
      title: item.title,
      context: "Task",
      active: item.kind === "task" && !["completed", "archived"].includes(item.status),
    };
  }

  const action = item.actions.find((candidate) => candidate.id === focus.sourceActionId);
  if (!action) return null;
  return {
    ...focus,
    title: action.title,
    context: item.title,
    active: item.kind === "project" && !["completed", "archived"].includes(item.status) && !action.completedAt,
  };
}

export function currentWeeklyFocus(
  items: readonly Item[],
  focuses: readonly WeeklyFocus[],
  reference = new Date(),
) {
  const period = getRhythmPeriod(reference);
  return focuses
    .filter((focus) => focus.weekStart === period.start)
    .flatMap((focus): ResolvedWeeklyFocus[] => {
      const resolved = resolveWeeklyFocus(items, focus);
      return resolved && resolved.active ? [resolved] : [];
    })
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

export function focusMatches(
  focus: WeeklyFocus,
  sourceType: WeeklyFocusSourceType,
  sourceItemId: string,
  sourceActionId?: string,
) {
  return focus.sourceType === sourceType
    && focus.sourceItemId === sourceItemId
    && (sourceType === "task" || focus.sourceActionId === sourceActionId);
}
