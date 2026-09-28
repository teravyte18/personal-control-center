import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeTodayEntries } from "../src/domain/home-today.ts";
import type { Item } from "../src/domain/personal-data.ts";

function baseItem(overrides: Partial<Item> & Pick<Item, "id" | "title" | "kind">): Item {
  return {
    id: overrides.id,
    title: overrides.title,
    kind: overrides.kind,
    description: "",
    actions: [],
    status: "active",
    area: "personal",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

test("Home Today combines overdue and due Tasks with Project Actions", () => {
  const items: Item[] = [
    baseItem({ id: "task-overdue", title: "Old task", kind: "task", checkInDate: "2026-09-18" }),
    baseItem({ id: "task-today", title: "Today task", kind: "task", checkInDate: "2026-09-19" }),
    baseItem({
      id: "project",
      title: "Example project",
      kind: "project",
      actions: [
        {
          id: "old-action",
          title: "Old action",
          targetDate: "2026-09-17",
          openedAt: "2026-09-10T10:00:00.000Z",
          updatedAt: "2026-09-10T10:00:00.000Z",
        },
        {
          id: "today-action",
          title: "Today action",
          targetDate: "2026-09-19",
          openedAt: "2026-09-10T10:00:00.000Z",
          updatedAt: "2026-09-10T10:00:00.000Z",
        },
      ],
    }),
  ];

  const entries = buildHomeTodayEntries(items, new Date(2026, 8, 19, 12));

  assert.deepEqual(entries.map((entry) => [entry.state, entry.title]), [
    ["overdue", "Old action"],
    ["overdue", "Old task"],
    ["today", "Today action"],
    ["today", "Today task"],
  ]);
  assert.equal(entries[0].context, "Example project");
});

test("Home Today ignores undated, completed, waiting, and archived work", () => {
  const items: Item[] = [
    baseItem({ id: "undated", title: "Undated task", kind: "task" }),
    baseItem({ id: "done", title: "Done task", kind: "task", status: "completed", checkInDate: "2026-09-18" }),
    baseItem({
      id: "waiting",
      title: "Waiting project",
      kind: "project",
      status: "waiting",
      actions: [{
        id: "waiting-action",
        title: "Waiting action",
        targetDate: "2026-09-18",
        openedAt: "2026-09-10T10:00:00.000Z",
        updatedAt: "2026-09-10T10:00:00.000Z",
      }],
    }),
  ];

  assert.deepEqual(buildHomeTodayEntries(items, new Date(2026, 8, 19, 12)), []);
});
