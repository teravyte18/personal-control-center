import { getExpenseCategory } from "./expenses.ts";
import { getRecipes } from "./food.ts";
import { getBookScore, getBooks } from "./library.ts";
import { getMediaItems } from "./media.ts";
import { getNotes } from "./notes.ts";
import {
  currentWeeklyFocus,
  getRhythmPeriod,
  getRhythmProgress,
} from "./weekly-rhythm.ts";
import type { Item, ReviewDraft } from "./personal-data";
import type { PersonalDataSnapshot } from "./personal-data-snapshot";

export const personalContextDomains = [
  "projects",
  "tasks",
  "reviews",
  "rhythm",
  "thoughts",
  "notes",
  "library",
  "food",
  "expenses",
] as const;

export type PersonalContextDomain = (typeof personalContextDomains)[number];

export const personalContextPurposes = [
  "general",
  "weekly-planning",
  "reflection",
  "conversation",
  "development",
] as const;

export type PersonalContextPurpose = (typeof personalContextPurposes)[number];

export type PersonalContextLimits = {
  maxRecordsPerDomain: number;
  recentDays: number;
  maxTextChars: number;
  maxProjectActions: number;
};

export const defaultPersonalContextLimits: PersonalContextLimits = {
  maxRecordsPerDomain: 12,
  recentDays: 90,
  maxTextChars: 1200,
  maxProjectActions: 6,
};

export type PersonalContextOptions = {
  domains: readonly PersonalContextDomain[];
  purpose: PersonalContextPurpose;
  limits?: Partial<PersonalContextLimits>;
  now?: Date;
};

type ContextProjectAction = {
  id: string;
  title: string;
  targetDate?: string;
  details?: string;
  openedAt: string;
};

type ContextProject = {
  id: string;
  title: string;
  description?: string;
  area: Item["area"];
  status: Item["status"];
  updatedAt: string;
  completedAt?: string;
  takeaways?: string;
  needsNextAction: boolean;
  openActions: ContextProjectAction[];
};

type ContextTask = {
  id: string;
  title: string;
  description?: string;
  area: Item["area"];
  status: Item["status"];
  checkInDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

type ContextReview = {
  id: string;
  periodStart: string;
  periodEnd: string;
  completedAt: string;
  location?: string;
  happened?: string;
  wentWell?: string;
  difficult?: string;
  learned?: string;
  nextWeek?: string;
};

type ContextReviewDraft = Omit<ContextReview, "id" | "completedAt">;

type ContextThought = {
  id: string;
  title: string;
  description?: string;
  area: Item["area"];
  createdAt: string;
  updatedAt: string;
};

type ContextNote = {
  id: string;
  title: string;
  body?: string;
  area: Item["area"];
  updatedAt: string;
};

type ContextLibraryRecord =
  | {
    type: "book";
    id: string;
    title: string;
    author?: string;
    contentType: string;
    format: string;
    currentIssue?: string;
    issuesRead?: string;
    readingState: string;
    ownership: string;
    priority: string;
    startDate?: string;
    finishDate?: string;
    rating?: number;
    thoughts?: string;
    updatedAt: string;
  }
  | {
    type: "film" | "series";
    id: string;
    title: string;
    status: string;
    rating?: number;
    thoughts?: string;
    watchedDate?: string;
    startDate?: string;
    finishDate?: string;
    currentSeason?: number;
    currentEpisode?: number;
    updatedAt: string;
  };

type ContextRecipe = {
  id: string;
  title: string;
  tags: string[];
  rating?: number;
  makeAgain: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients?: string;
  steps?: string;
  notes?: string;
  updatedAt: string;
};

type ContextExpense = {
  id: string;
  type: "expense" | "income";
  amountCents: number;
  categoryId: string;
  category: string;
  bucket?: string;
  description?: string;
  occurredOn: string;
};

type ContextRhythm = {
  periodStart: string;
  periodEnd: string;
  intentions: Array<{
    id: string;
    title: string;
    targetPerWeek: number;
    completedThisWeek: number;
    area?: string;
    preferredDaypart?: string;
    approximateMinutes?: number;
    note?: string;
  }>;
  weeklyFocus: Array<{
    id: string;
    sourceType: "task" | "project-action";
    sourceItemId: string;
    sourceActionId?: string;
    title: string;
    context: string;
  }>;
};

export type PersonalContext = {
  version: 1;
  purpose: PersonalContextPurpose;
  generatedAt: string;
  selectedDomains: PersonalContextDomain[];
  limits: PersonalContextLimits;
  domains: Partial<{
    projects: ContextProject[];
    tasks: ContextTask[];
    reviews: {
      currentDraft: ContextReviewDraft | null;
      recent: ContextReview[];
    };
    rhythm: ContextRhythm;
    thoughts: ContextThought[];
    notes: ContextNote[];
    library: ContextLibraryRecord[];
    food: ContextRecipe[];
    expenses: {
      windowStart: string;
      totals: {
        incomeCents: number;
        expenseCents: number;
        byBucketCents: Record<string, number>;
      };
      recentTransactions: ContextExpense[];
    };
  }>;
};

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function normalizePersonalContextLimits(
  value: Partial<PersonalContextLimits> | undefined,
): PersonalContextLimits {
  return {
    maxRecordsPerDomain: clampInteger(value?.maxRecordsPerDomain, defaultPersonalContextLimits.maxRecordsPerDomain, 1, 50),
    recentDays: clampInteger(value?.recentDays, defaultPersonalContextLimits.recentDays, 1, 3650),
    maxTextChars: clampInteger(value?.maxTextChars, defaultPersonalContextLimits.maxTextChars, 80, 4000),
    maxProjectActions: clampInteger(value?.maxProjectActions, defaultPersonalContextLimits.maxProjectActions, 1, 20),
  };
}

export function parsePersonalContextDomains(values: readonly string[]): PersonalContextDomain[] | null {
  const valid = new Set<string>(personalContextDomains);
  const domains: PersonalContextDomain[] = [];

  for (const value of values) {
    if (!valid.has(value)) return null;
    const domain = value as PersonalContextDomain;
    if (!domains.includes(domain)) domains.push(domain);
  }

  return domains.length ? domains : null;
}

export function parsePersonalContextPurpose(value: string | null): PersonalContextPurpose | null {
  if (!value) return "development";
  return personalContextPurposes.includes(value as PersonalContextPurpose)
    ? value as PersonalContextPurpose
    : null;
}

function text(value: string | undefined, limit: number) {
  const normalized = (value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return undefined;
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function date(value: string | undefined) {
  return value || undefined;
}

function recentCutoff(now: Date, recentDays: number) {
  return now.getTime() - recentDays * 24 * 60 * 60 * 1000;
}

function isRecentTimestamp(value: string | undefined, cutoff: number) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed >= cutoff;
}

function newestFirst<T>(values: readonly T[], getTimestamp: (value: T) => string) {
  return [...values].sort((left, right) => Date.parse(getTimestamp(right)) - Date.parse(getTimestamp(left)));
}

function projectContext(
  items: readonly Item[],
  limits: PersonalContextLimits,
  cutoff: number,
): ContextProject[] {
  const projects = items.filter((item) => (
    item.kind === "project"
    && item.status !== "archived"
    && (item.status !== "completed" || isRecentTimestamp(item.completedAt, cutoff))
  ));

  return projects
    .sort((left, right) => {
      const leftClosed = left.status === "completed" ? 1 : 0;
      const rightClosed = right.status === "completed" ? 1 : 0;
      return leftClosed - rightClosed || Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    })
    .slice(0, limits.maxRecordsPerDomain)
    .map((project) => {
      const openActions = project.actions
        .filter((action) => !action.completedAt)
        .sort((left, right) => {
          if (left.targetDate && right.targetDate) return left.targetDate.localeCompare(right.targetDate);
          if (left.targetDate !== right.targetDate) return left.targetDate ? -1 : 1;
          return Date.parse(right.openedAt) - Date.parse(left.openedAt);
        })
        .slice(0, limits.maxProjectActions)
        .map((action): ContextProjectAction => ({
          id: action.id,
          title: action.title,
          targetDate: date(action.targetDate),
          details: text(action.details, limits.maxTextChars),
          openedAt: action.openedAt,
        }));

      return {
        id: project.id,
        title: project.title,
        description: text(project.description, limits.maxTextChars),
        area: project.area,
        status: project.status,
        updatedAt: project.updatedAt,
        completedAt: date(project.completedAt),
        takeaways: text(project.projectTakeaways, limits.maxTextChars),
        needsNextAction: project.status !== "completed" && openActions.length === 0,
        openActions,
      };
    });
}

function taskContext(items: readonly Item[], limits: PersonalContextLimits, cutoff: number): ContextTask[] {
  return items
    .filter((item) => (
      item.kind === "task"
      && item.status !== "archived"
      && (item.status !== "completed" || isRecentTimestamp(item.completedAt, cutoff))
    ))
    .sort((left, right) => {
      const leftClosed = left.status === "completed" ? 1 : 0;
      const rightClosed = right.status === "completed" ? 1 : 0;
      if (leftClosed !== rightClosed) return leftClosed - rightClosed;
      if (left.checkInDate && right.checkInDate) return left.checkInDate.localeCompare(right.checkInDate);
      if (left.checkInDate !== right.checkInDate) return left.checkInDate ? -1 : 1;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    })
    .slice(0, limits.maxRecordsPerDomain)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: text(item.description, limits.maxTextChars),
      area: item.area,
      status: item.status,
      checkInDate: date(item.checkInDate),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: date(item.completedAt),
    }));
}

const reviewTextFields = ["location", "happened", "wentWell", "difficult", "learned", "nextWeek"] as const;

function reviewDraftContext(draft: ReviewDraft, maxTextChars: number): ContextReviewDraft | null {
  const hasContent = reviewTextFields.some((field) => draft[field].trim().length > 0);
  if (!hasContent && !draft.periodStart && !draft.periodEnd) return null;

  return {
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    location: text(draft.location, maxTextChars),
    happened: text(draft.happened, maxTextChars),
    wentWell: text(draft.wentWell, maxTextChars),
    difficult: text(draft.difficult, maxTextChars),
    learned: text(draft.learned, maxTextChars),
    nextWeek: text(draft.nextWeek, maxTextChars),
  };
}

function reviewContext(snapshot: PersonalDataSnapshot, limits: PersonalContextLimits, cutoff: number) {
  const recent = newestFirst(
    snapshot.history.filter((entry) => isRecentTimestamp(entry.completedAt, cutoff)),
    (entry) => entry.completedAt,
  )
    .slice(0, limits.maxRecordsPerDomain)
    .map((entry): ContextReview => ({
      id: entry.id,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      completedAt: entry.completedAt,
      location: text(entry.location, limits.maxTextChars),
      happened: text(entry.happened, limits.maxTextChars),
      wentWell: text(entry.wentWell, limits.maxTextChars),
      difficult: text(entry.difficult, limits.maxTextChars),
      learned: text(entry.learned, limits.maxTextChars),
      nextWeek: text(entry.nextWeek, limits.maxTextChars),
    }));

  return {
    currentDraft: reviewDraftContext(snapshot.draft, limits.maxTextChars),
    recent,
  };
}

function thoughtContext(items: readonly Item[], limits: PersonalContextLimits, cutoff: number): ContextThought[] {
  return newestFirst(
    items.filter((item) => (
      item.kind === "thought"
      && item.status !== "archived"
      && isRecentTimestamp(item.createdAt, cutoff)
    )),
    (item) => item.createdAt,
  )
    .slice(0, limits.maxRecordsPerDomain)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: text(item.description, limits.maxTextChars),
      area: item.area,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
}

function noteContext(items: readonly Item[], limits: PersonalContextLimits, cutoff: number): ContextNote[] {
  return newestFirst(
    getNotes(items).filter((item) => isRecentTimestamp(item.updatedAt, cutoff)),
    (item) => item.updatedAt,
  )
    .slice(0, limits.maxRecordsPerDomain)
    .map((item) => ({
      id: item.id,
      title: item.title,
      body: text(item.description, limits.maxTextChars),
      area: item.area,
      updatedAt: item.updatedAt,
    }));
}

function libraryContext(items: readonly Item[], limits: PersonalContextLimits): ContextLibraryRecord[] {
  const books: ContextLibraryRecord[] = getBooks(items).map((book) => ({
    type: "book",
    id: book.item.id,
    title: book.item.title,
    author: text(book.details.author, limits.maxTextChars),
    contentType: book.details.contentType,
    format: book.details.format,
    currentIssue: text(book.details.currentIssue, limits.maxTextChars),
    issuesRead: text(book.details.issuesRead, limits.maxTextChars),
    readingState: book.details.readingState,
    ownership: book.details.ownership,
    priority: book.details.priority,
    startDate: date(book.details.startDate),
    finishDate: date(book.details.finishDate),
    rating: getBookScore(book.details),
    thoughts: text(book.details.thoughts, limits.maxTextChars),
    updatedAt: book.item.updatedAt,
  }));

  const media: ContextLibraryRecord[] = getMediaItems(items).map((entry) => ({
    type: entry.details.type,
    id: entry.item.id,
    title: entry.item.title,
    status: entry.details.status,
    rating: entry.details.rating,
    thoughts: text(entry.details.thoughts, limits.maxTextChars),
    watchedDate: date(entry.details.watchedDate),
    startDate: date(entry.details.startDate),
    finishDate: date(entry.details.finishDate),
    currentSeason: entry.details.currentSeason,
    currentEpisode: entry.details.currentEpisode,
    updatedAt: entry.item.updatedAt,
  }));

  function rank(record: ContextLibraryRecord) {
    if (record.type === "book") {
      if (record.readingState === "reading") return 0;
      if (record.priority === "up-next") return 1;
      if (record.readingState === "finished") return 2;
      if (record.ownership === "wishlist") return 4;
      return 3;
    }
    if (record.status === "watching") return 0;
    if (record.status === "completed") return 2;
    if (record.status === "wishlist") return 3;
    return 4;
  }

  return [...books, ...media]
    .sort((left, right) => rank(left) - rank(right) || Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, limits.maxRecordsPerDomain);
}

function foodContext(items: readonly Item[], limits: PersonalContextLimits): ContextRecipe[] {
  return getRecipes(items)
    .sort((left, right) => {
      const leftAgain = left.details.makeAgain === "yes" ? 0 : left.details.makeAgain === "unspecified" ? 1 : 2;
      const rightAgain = right.details.makeAgain === "yes" ? 0 : right.details.makeAgain === "unspecified" ? 1 : 2;
      if (leftAgain !== rightAgain) return leftAgain - rightAgain;
      const leftRating = left.details.rating ?? -1;
      const rightRating = right.details.rating ?? -1;
      return rightRating - leftRating || Date.parse(right.item.updatedAt) - Date.parse(left.item.updatedAt);
    })
    .slice(0, limits.maxRecordsPerDomain)
    .map((recipe) => ({
      id: recipe.item.id,
      title: recipe.item.title,
      tags: recipe.details.tags,
      rating: recipe.details.rating,
      makeAgain: recipe.details.makeAgain,
      servings: recipe.details.servings,
      prepMinutes: recipe.details.prepMinutes,
      cookMinutes: recipe.details.cookMinutes,
      ingredients: text(recipe.details.ingredients, limits.maxTextChars),
      steps: text(recipe.details.steps, limits.maxTextChars),
      notes: text(recipe.details.notes, limits.maxTextChars),
      updatedAt: recipe.item.updatedAt,
    }));
}

function rhythmContext(snapshot: PersonalDataSnapshot, limits: PersonalContextLimits, now: Date): ContextRhythm {
  const period = getRhythmPeriod(now);
  const intentions = snapshot.rhythmTemplates
    .filter((template) => template.state === "active")
    .sort((left, right) => left.title.localeCompare(right.title))
    .slice(0, limits.maxRecordsPerDomain)
    .map((template) => ({
      id: template.id,
      title: template.title,
      targetPerWeek: template.targetPerWeek,
      completedThisWeek: getRhythmProgress(template.id, snapshot.rhythmCompletions, period).count,
      area: template.area,
      preferredDaypart: template.preferredDaypart,
      approximateMinutes: template.approximateMinutes,
      note: text(template.note, limits.maxTextChars),
    }));

  const weeklyFocus = currentWeeklyFocus(snapshot.items, snapshot.weeklyFocuses, now)
    .slice(0, limits.maxRecordsPerDomain)
    .map((focus) => ({
      id: focus.id,
      sourceType: focus.sourceType,
      sourceItemId: focus.sourceItemId,
      sourceActionId: focus.sourceActionId,
      title: focus.title,
      context: focus.context,
    }));

  return {
    periodStart: period.start,
    periodEnd: period.end,
    intentions,
    weeklyFocus,
  };
}

function expenseContext(snapshot: PersonalDataSnapshot, limits: PersonalContextLimits, cutoff: number) {
  const windowTransactions = snapshot.expenseTransactions.filter((transaction) => (
    Date.parse(`${transaction.occurredOn}T23:59:59.999Z`) >= cutoff
  ));

  const totals = {
    incomeCents: 0,
    expenseCents: 0,
    byBucketCents: {} as Record<string, number>,
  };

  for (const transaction of windowTransactions) {
    if (transaction.type === "income") {
      totals.incomeCents += transaction.amountCents;
      continue;
    }
    totals.expenseCents += transaction.amountCents;
    const category = getExpenseCategory(transaction.categoryId);
    if (category?.bucket) {
      totals.byBucketCents[category.bucket] = (totals.byBucketCents[category.bucket] ?? 0) + transaction.amountCents;
    }
  }

  const recentTransactions = [...windowTransactions]
    .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn) || right.createdAt.localeCompare(left.createdAt))
    .slice(0, limits.maxRecordsPerDomain)
    .map((transaction): ContextExpense => {
      const category = getExpenseCategory(transaction.categoryId);
      return {
        id: transaction.id,
        type: transaction.type,
        amountCents: transaction.amountCents,
        categoryId: transaction.categoryId,
        category: category?.label ?? transaction.categoryId,
        bucket: category?.bucket,
        description: text(transaction.description, limits.maxTextChars),
        occurredOn: transaction.occurredOn,
      };
    });

  return {
    windowStart: new Date(cutoff).toISOString(),
    totals,
    recentTransactions,
  };
}

export function buildPersonalContext(
  snapshot: PersonalDataSnapshot,
  options: PersonalContextOptions,
): PersonalContext {
  const now = options.now ?? new Date();
  const limits = normalizePersonalContextLimits(options.limits);
  const selectedDomains = [...new Set(options.domains)];
  const cutoff = recentCutoff(now, limits.recentDays);
  const domains: PersonalContext["domains"] = {};

  for (const domain of selectedDomains) {
    if (domain === "projects") domains.projects = projectContext(snapshot.items, limits, cutoff);
    if (domain === "tasks") domains.tasks = taskContext(snapshot.items, limits, cutoff);
    if (domain === "reviews") domains.reviews = reviewContext(snapshot, limits, cutoff);
    if (domain === "rhythm") domains.rhythm = rhythmContext(snapshot, limits, now);
    if (domain === "thoughts") domains.thoughts = thoughtContext(snapshot.items, limits, cutoff);
    if (domain === "notes") domains.notes = noteContext(snapshot.items, limits, cutoff);
    if (domain === "library") domains.library = libraryContext(snapshot.items, limits);
    if (domain === "food") domains.food = foodContext(snapshot.items, limits);
    if (domain === "expenses") domains.expenses = expenseContext(snapshot, limits, cutoff);
  }

  return {
    version: 1,
    purpose: options.purpose,
    generatedAt: now.toISOString(),
    selectedDomains,
    limits,
    domains,
  };
}
