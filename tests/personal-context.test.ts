import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPersonalContext,
  normalizePersonalContextLimits,
  parsePersonalContextDomains,
  parsePersonalContextPurpose,
} from "../src/domain/personal-context.ts";
import { defaultExpenseSettings, emptyExpenseReconciliation } from "../src/domain/expenses.ts";
import { serializeRecipeDetails, createRecipeDetails } from "../src/domain/food.ts";
import { createBookDetails, serializeBookDetails } from "../src/domain/library.ts";
import { createMediaDetails, serializeMediaDetails } from "../src/domain/media.ts";
import { emptyReview, type Item } from "../src/domain/personal-data.ts";
import type { PersonalDataSnapshot } from "../src/domain/personal-data-snapshot.ts";

function item(id: string, title: string, kind: Item["kind"], overrides: Partial<Item> = {}): Item {
  return {
    id,
    title,
    kind,
    description: "",
    actions: [],
    status: "active",
    area: "personal",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

function snapshot(overrides: Partial<PersonalDataSnapshot> = {}): PersonalDataSnapshot {
  return {
    items: [],
    draft: { ...emptyReview },
    history: [],
    expenseTransactions: [],
    expenseSettings: { ...defaultExpenseSettings, targets: { ...defaultExpenseSettings.targets } },
    expenseReconciliation: { ...emptyExpenseReconciliation },
    ...overrides,
  };
}

test("personal context exposes only explicitly selected bounded domains", () => {
  const longDescription = "x".repeat(200);
  const project = item("project", "Active project", "project", {
    description: longDescription,
    actions: [
      {
        id: "dated",
        title: "Dated action",
        targetDate: "2026-10-08",
        openedAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "undated",
        title: "Undated action",
        targetDate: "",
        openedAt: "2026-10-02T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z",
      },
    ],
  });
  const task = item("task", "Open task", "task", { checkInDate: "2026-10-07" });
  const note = item("note", "Normal note", "note", { description: "Reference body" });
  const book = item("book", "Example book", "note", {
    description: serializeBookDetails({
      ...createBookDetails("Book reflection"),
      author: "Example Author",
      readingState: "reading",
      ownership: "owned",
    }),
  });
  const media = item("series", "Example series", "note", {
    description: serializeMediaDetails({
      ...createMediaDetails(),
      type: "series",
      status: "watching",
      currentSeason: 2,
      currentEpisode: 3,
    }),
  });
  const recipe = item("recipe", "Example recipe", "note", {
    description: serializeRecipeDetails({
      ...createRecipeDetails(),
      ingredients: "Ingredient one\nIngredient two",
      steps: "Cook it.",
      makeAgain: "yes",
    }),
  });

  const context = buildPersonalContext(snapshot({
    items: [project, task, note, book, media, recipe],
  }), {
    domains: ["projects", "tasks", "notes", "library", "food"],
    purpose: "development",
    limits: { maxTextChars: 80, maxProjectActions: 1 },
    now: new Date("2026-10-05T12:00:00.000Z"),
  });

  assert.deepEqual(context.selectedDomains, ["projects", "tasks", "notes", "library", "food"]);
  assert.deepEqual(Object.keys(context.domains), ["projects", "tasks", "notes", "library", "food"]);
  assert.equal(context.domains.projects?.[0].id, "project");
  assert.equal(context.domains.projects?.[0].openActions.length, 1);
  assert.equal(context.domains.projects?.[0].openActions[0].id, "dated");
  assert.match(context.domains.projects?.[0].description ?? "", /…$/);
  assert.deepEqual(context.domains.notes?.map((entry) => entry.id), ["note"]);
  assert.deepEqual(context.domains.library?.map((entry) => entry.id), ["book", "series"]);
  assert.deepEqual(context.domains.food?.map((entry) => entry.id), ["recipe"]);
  assert.equal("expenses" in context.domains, false);
});

test("personal context keeps open state, filters stale completed history, and preserves stable ids", () => {
  const items: Item[] = [
    item("open-project", "Open project", "project"),
    item("recent-project", "Recent project", "project", {
      status: "completed",
      completedAt: "2026-09-30T12:00:00.000Z",
      updatedAt: "2026-09-30T12:00:00.000Z",
    }),
    item("old-project", "Old project", "project", {
      status: "completed",
      completedAt: "2025-01-01T12:00:00.000Z",
      updatedAt: "2025-01-01T12:00:00.000Z",
    }),
    item("archived-project", "Archived project", "project", { status: "archived" }),
    item("open-task", "Open task", "task"),
    item("recent-task", "Recent task", "task", {
      status: "completed",
      completedAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }),
    item("old-task", "Old task", "task", {
      status: "completed",
      completedAt: "2025-01-01T12:00:00.000Z",
      updatedAt: "2025-01-01T12:00:00.000Z",
    }),
  ];

  const context = buildPersonalContext(snapshot({ items }), {
    domains: ["projects", "tasks"],
    purpose: "weekly-planning",
    limits: { recentDays: 30 },
    now: new Date("2026-10-05T12:00:00.000Z"),
  });

  assert.deepEqual(context.domains.projects?.map((entry) => entry.id), ["open-project", "recent-project"]);
  assert.equal(context.domains.projects?.[0].needsNextAction, true);
  assert.deepEqual(context.domains.tasks?.map((entry) => entry.id), ["open-task", "recent-task"]);
});

test("reviews and expenses expose bounded recent history only when selected", () => {
  const context = buildPersonalContext(snapshot({
    draft: {
      ...emptyReview,
      periodStart: "2026-10-03",
      periodEnd: "2026-10-09",
      nextWeek: "Keep the week flexible.",
    },
    history: [
      {
        ...emptyReview,
        id: "recent-review",
        periodStart: "2026-09-26",
        periodEnd: "2026-10-02",
        learned: "Recent lesson",
        completedAt: "2026-10-03T09:00:00.000Z",
      },
      {
        ...emptyReview,
        id: "old-review",
        periodStart: "2025-01-01",
        periodEnd: "2025-01-07",
        completedAt: "2025-01-08T09:00:00.000Z",
      },
    ],
    expenseTransactions: [
      {
        id: "recent-expense",
        type: "expense",
        amountCents: 2500,
        categoryId: "books",
        description: "Book",
        occurredOn: "2026-10-02",
        createdAt: "2026-10-02T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z",
      },
      {
        id: "recent-income",
        type: "income",
        amountCents: 100000,
        categoryId: "paycheck",
        description: "Income",
        occurredOn: "2026-10-01",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "old-expense",
        type: "expense",
        amountCents: 9999,
        categoryId: "games",
        description: "Old",
        occurredOn: "2025-01-01",
        createdAt: "2025-01-01T10:00:00.000Z",
        updatedAt: "2025-01-01T10:00:00.000Z",
      },
    ],
  }), {
    domains: ["reviews", "expenses"],
    purpose: "reflection",
    limits: { recentDays: 30 },
    now: new Date("2026-10-05T12:00:00.000Z"),
  });

  assert.equal(context.domains.reviews?.currentDraft?.nextWeek, "Keep the week flexible.");
  assert.deepEqual(context.domains.reviews?.recent.map((entry) => entry.id), ["recent-review"]);
  assert.deepEqual(
    context.domains.expenses?.recentTransactions.map((entry) => entry.id),
    ["recent-expense", "recent-income"],
  );
  assert.equal(context.domains.expenses?.totals.expenseCents, 2500);
  assert.equal(context.domains.expenses?.totals.incomeCents, 100000);
  assert.equal(context.domains.expenses?.totals.byBucketCents.fun, 2500);
});

test("context domain parsing rejects undeclared domains and limits are clamped", () => {
  assert.deepEqual(parsePersonalContextDomains(["projects", "tasks", "projects"]), ["projects", "tasks"]);
  assert.equal(parsePersonalContextDomains(["projects", "keychain"]), null);
  assert.equal(parsePersonalContextDomains([]), null);
  assert.equal(parsePersonalContextPurpose(null), "development");
  assert.equal(parsePersonalContextPurpose("weekly-planning"), "weekly-planning");
  assert.equal(parsePersonalContextPurpose("unknown"), null);

  assert.deepEqual(normalizePersonalContextLimits({
    maxRecordsPerDomain: 999,
    recentDays: 0,
    maxTextChars: 10,
    maxProjectActions: 0,
  }), {
    maxRecordsPerDomain: 50,
    recentDays: 1,
    maxTextChars: 80,
    maxProjectActions: 1,
  });
});
