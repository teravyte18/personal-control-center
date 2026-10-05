import assert from "node:assert/strict";
import test from "node:test";
import {
  createRhythmCompletion,
  createRhythmTemplate,
  createWeeklyFocus,
  currentWeeklyFocus,
  getDatedRhythmWork,
  getRhythmPeriod,
  getRhythmProgress,
  normalizeRhythmTemplates,
  normalizeWeeklyFocuses,
  resolveWeeklyFocus,
} from "../src/domain/weekly-rhythm.ts";
import {
  applyPersonalDataMutation,
  emptyPersonalDataSnapshot,
  normalizePersonalDataMutation,
} from "../src/domain/personal-data-snapshot.ts";
import type { Item } from "../src/domain/personal-data.ts";

function item(overrides: Partial<Item> & Pick<Item, "id" | "title" | "kind">): Item {
  return {
    id: overrides.id,
    title: overrides.title,
    kind: overrides.kind,
    description: "",
    actions: [],
    status: "active",
    area: "personal",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

test("Weekly Rhythm uses Saturday-to-Friday periods", () => {
  assert.deepEqual(getRhythmPeriod(new Date(2026, 9, 3, 0, 1)), {
    start: "2026-10-03",
    end: "2026-10-09",
  });
  assert.deepEqual(getRhythmPeriod(new Date(2026, 9, 5, 12)), {
    start: "2026-10-03",
    end: "2026-10-09",
  });
  assert.deepEqual(getRhythmPeriod(new Date(2026, 9, 9, 23, 59)), {
    start: "2026-10-03",
    end: "2026-10-09",
  });
  assert.deepEqual(getRhythmPeriod(new Date(2026, 9, 10, 0, 1)), {
    start: "2026-10-10",
    end: "2026-10-16",
  });
});

test("Rhythm templates and completions validate bounded simple weekly targets", () => {
  const template = createRhythmTemplate("Run", 3, {
    preferredDaypart: "morning",
    approximateMinutes: 30,
  }, new Date("2026-10-03T08:00:00.000Z"));
  assert.ok(template);
  assert.equal(template.targetPerWeek, 3);
  assert.equal(createRhythmTemplate("", 3), null);
  assert.equal(createRhythmTemplate("Run", 0), null);
  assert.equal(createRhythmTemplate("Run", 3, { approximateMinutes: 1 }), null);

  const normalized = normalizeRhythmTemplates([
    template,
    { ...template, id: "bad-target", targetPerWeek: 99 },
    { ...template, id: "paused", title: "Read", state: "paused" },
  ]);
  assert.deepEqual(normalized.map((entry) => entry.id), [template.id, "paused"]);

  const first = createRhythmCompletion(template.id, new Date("2026-10-04T09:00:00.000Z"));
  const second = createRhythmCompletion(template.id, new Date("2026-10-05T09:00:00.000Z"));
  const old = createRhythmCompletion(template.id, new Date("2026-09-30T09:00:00.000Z"));
  assert.ok(first && second && old);

  const progress = getRhythmProgress(template.id, [old, first, second], {
    start: "2026-10-03",
    end: "2026-10-09",
  });
  assert.equal(progress.count, 2);
  assert.deepEqual(progress.completions.map((entry) => entry.id), [second.id, first.id]);
});

test("dated work includes only open Tasks and Project Actions inside the Rhythm period", () => {
  const items: Item[] = [
    item({ id: "task-in", title: "Task this week", kind: "task", checkInDate: "2026-10-05" }),
    item({ id: "task-out", title: "Task later", kind: "task", checkInDate: "2026-10-12" }),
    item({ id: "task-done", title: "Done task", kind: "task", status: "completed", checkInDate: "2026-10-06" }),
    item({
      id: "project",
      title: "Project",
      kind: "project",
      actions: [
        {
          id: "action-in",
          title: "Action this week",
          targetDate: "2026-10-07",
          openedAt: "2026-10-01T10:00:00.000Z",
          updatedAt: "2026-10-01T10:00:00.000Z",
        },
        {
          id: "action-done",
          title: "Done action",
          targetDate: "2026-10-08",
          openedAt: "2026-10-01T10:00:00.000Z",
          updatedAt: "2026-10-08T10:00:00.000Z",
          completedAt: "2026-10-08T10:00:00.000Z",
        },
      ],
    }),
  ];

  const work = getDatedRhythmWork(items, { start: "2026-10-03", end: "2026-10-09" });
  assert.deepEqual(work.map((entry) => entry.id), [
    "task:task-in",
    "project-action:project:action-in",
  ]);
});

test("Weekly Focus resolves canonical Tasks and Project Actions and ignores completed sources", () => {
  const task = item({ id: "task", title: "Flexible task", kind: "task" });
  const project = item({
    id: "project",
    title: "Project",
    kind: "project",
    actions: [{
      id: "action",
      title: "Flexible action",
      targetDate: "",
      openedAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    }],
  });
  const taskFocus = createWeeklyFocus("task", task.id, undefined, new Date("2026-10-05T12:00:00.000Z"));
  const actionFocus = createWeeklyFocus("project-action", project.id, "action", new Date("2026-10-05T12:00:00.000Z"));
  assert.ok(taskFocus && actionFocus);
  assert.equal(taskFocus.weekStart, "2026-10-03");

  const resolved = currentWeeklyFocus([task, project], [actionFocus, taskFocus], new Date("2026-10-05T12:00:00.000Z"));
  assert.deepEqual(resolved.map((entry) => entry.title), ["Flexible task", "Flexible action"]);
  assert.equal(resolveWeeklyFocus([{ ...task, status: "completed" }], taskFocus)?.active, false);

  assert.deepEqual(normalizeWeeklyFocuses([
    taskFocus,
    { ...taskFocus, id: "bad", weekStart: "not-a-date" },
  ]).map((entry) => entry.id), [taskFocus.id]);
});

test("snapshot mutations persist Rhythm and avoid duplicate Weekly Focus records", () => {
  const template = {
    id: "rhythm-1",
    title: "Run",
    targetPerWeek: 3,
    state: "active" as const,
    createdAt: "2026-10-03T08:00:00.000Z",
    updatedAt: "2026-10-03T08:00:00.000Z",
  };
  const addTemplate = normalizePersonalDataMutation({ type: "add-rhythm-template", template });
  assert.ok(addTemplate);

  let snapshot = applyPersonalDataMutation(emptyPersonalDataSnapshot, addTemplate);
  assert.equal(snapshot.rhythmTemplates.length, 1);

  const completion = {
    id: "completion-1",
    templateId: "rhythm-1",
    completedAt: "2026-10-04T09:00:00.000Z",
  };
  const addCompletion = normalizePersonalDataMutation({ type: "add-rhythm-completion", completion });
  assert.ok(addCompletion);
  snapshot = applyPersonalDataMutation(snapshot, addCompletion);
  assert.equal(snapshot.rhythmCompletions.length, 1);

  const focus = {
    id: "focus-1",
    weekStart: "2026-10-03",
    sourceType: "task",
    sourceItemId: "task-1",
    createdAt: "2026-10-03T08:00:00.000Z",
  };
  const addFocus = normalizePersonalDataMutation({ type: "add-weekly-focus", focus });
  assert.ok(addFocus);
  snapshot = applyPersonalDataMutation(snapshot, addFocus);
  snapshot = applyPersonalDataMutation(snapshot, {
    ...addFocus,
    focus: { ...focus, id: "focus-duplicate" },
  });
  assert.equal(snapshot.weeklyFocuses.length, 1);

  const update = normalizePersonalDataMutation({
    type: "update-rhythm-template",
    id: "rhythm-1",
    updates: { targetPerWeek: 4, state: "paused" },
    occurredAt: "2026-10-05T10:00:00.000Z",
  });
  assert.ok(update);
  snapshot = applyPersonalDataMutation(snapshot, update);
  assert.equal(snapshot.rhythmTemplates[0].targetPerWeek, 4);
  assert.equal(snapshot.rhythmTemplates[0].state, "paused");

  snapshot = applyPersonalDataMutation(snapshot, { type: "delete-rhythm-template", id: "rhythm-1" });
  assert.equal(snapshot.rhythmTemplates.length, 0);
  assert.equal(snapshot.rhythmCompletions.length, 0);
});
