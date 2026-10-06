export type HomeNearTermEntry = {
  id: string;
  sourceId: string;
  kind: "task" | "project-action";
  state: "overdue" | "today" | "upcoming";
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

function endOfRhythmWeek(reference: Date) {
  const end = new Date(reference);
  end.setHours(12, 0, 0, 0);
  const daysUntilFriday = (5 - end.getDay() + 7) % 7;
  end.setDate(end.getDate() + daysUntilFriday);
  return localDateKey(end);
}

export function buildHomeNearTermEntries(items: readonly HomeItem[], reference = new Date()): HomeNearTermEntry[] {
  const today = localDateKey(reference);
  const weekEnd = endOfRhythmWeek(reference);
  const entries: HomeNearTermEntry[] = [];

  for (const item of items) {
    if (isOpenTask(item)) {
      const date = item.checkInDate ?? "";
      if (date && date <= weekEnd) {
        entries.push({
          id: `task:${item.id}`,
          sourceId: item.id,
          kind: "task",
          state: date < today ? "overdue" : date === today ? "today" : "upcoming",
          title: item.title,
          context: "Task",
          date,
        });
      }
      continue;
    }

    if (!isEligibleProject(item)) continue;
    for (const action of item.actions) {
      if (action.completedAt || !action.targetDate || action.targetDate > weekEnd) continue;

      entries.push({
        id: `project-action:${item.id}:${action.id}`,
        sourceId: item.id,
        kind: "project-action",
        state: action.targetDate < today ? "overdue" : action.targetDate === today ? "today" : "upcoming",
        title: action.title,
        context: item.title,
        date: action.targetDate,
      });
    }
  }

  const stateOrder: Record<HomeNearTermEntry["state"], number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
  };

  return entries.sort((left, right) => {
    if (left.state !== right.state) return stateOrder[left.state] - stateOrder[right.state];
    const byDate = left.date.localeCompare(right.date);
    return byDate || left.title.localeCompare(right.title);
  });
}
