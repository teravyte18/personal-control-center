import { isProjectActionDueToday, isProjectActionPastCheckIn } from "./project-dates";
import { isTaskDueToday, isTaskOverdue, type Item } from "./personal-data";

export type HomeTodayEntry = {
  id: string;
  sourceId: string;
  kind: "task" | "project-action";
  state: "overdue" | "today";
  title: string;
  context: string;
  date: string;
};

function isEligibleProject(item: Item) {
  return item.kind === "project" && !["waiting", "completed", "archived"].includes(item.status);
}

export function buildHomeTodayEntries(items: readonly Item[], reference = new Date()): HomeTodayEntry[] {
  const entries: HomeTodayEntry[] = [];

  for (const item of items) {
    if (item.kind === "task") {
      if (isTaskOverdue(item, reference) || isTaskDueToday(item, reference)) {
        entries.push({
          id: `task:${item.id}`,
          sourceId: item.id,
          kind: "task",
          state: isTaskOverdue(item, reference) ? "overdue" : "today",
          title: item.title,
          context: "Task",
          date: item.checkInDate ?? "",
        });
      }
      continue;
    }

    if (!isEligibleProject(item)) continue;
    for (const action of item.actions) {
      if (action.completedAt || !action.targetDate) continue;
      const overdue = isProjectActionPastCheckIn(action, reference);
      const dueToday = isProjectActionDueToday(action, reference);
      if (!overdue && !dueToday) continue;

      entries.push({
        id: `project-action:${item.id}:${action.id}`,
        sourceId: item.id,
        kind: "project-action",
        state: overdue ? "overdue" : "today",
        title: action.title,
        context: item.title,
        date: action.targetDate,
      });
    }
  }

  return entries.sort((left, right) => {
    if (left.state !== right.state) return left.state === "overdue" ? -1 : 1;
    const byDate = left.date.localeCompare(right.date);
    return byDate || left.title.localeCompare(right.title);
  });
}
