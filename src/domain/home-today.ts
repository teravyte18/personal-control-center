export type HomeTodayEntry = {
  id: string;
  sourceId: string;
  kind: "task" | "project-action";
  state: "overdue" | "today";
  title: string;
  context: string;
  date: string;
};

type HomeAction = {
  id: string;
  title: string;
  targetDate: string;
  completedAt?: string;
};

type HomeItem = {
  id: string;
  title: string;
  kind: string;
  status: string;
  checkInDate?: string;
  actions: HomeAction[];
};

function localDateKey(reference: Date) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isEligibleProject(item: HomeItem) {
  return item.kind === "project" && !["waiting", "completed", "archived"].includes(item.status);
}

function isOpenTask(item: HomeItem) {
  return item.kind === "task" && !["completed", "archived"].includes(item.status);
}

export function buildHomeTodayEntries(items: readonly HomeItem[], reference = new Date()): HomeTodayEntry[] {
  const today = localDateKey(reference);
  const entries: HomeTodayEntry[] = [];

  for (const item of items) {
    if (isOpenTask(item)) {
      const date = item.checkInDate ?? "";
      if (date && date <= today) {
        entries.push({
          id: `task:${item.id}`,
          sourceId: item.id,
          kind: "task",
          state: date < today ? "overdue" : "today",
          title: item.title,
          context: "Task",
          date,
        });
      }
      continue;
    }

    if (!isEligibleProject(item)) continue;
    for (const action of item.actions) {
      if (action.completedAt || !action.targetDate || action.targetDate > today) continue;

      entries.push({
        id: `project-action:${item.id}:${action.id}`,
        sourceId: item.id,
        kind: "project-action",
        state: action.targetDate < today ? "overdue" : "today",
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
