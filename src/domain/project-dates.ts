type ProjectActionWithDates = {
  targetDate: string;
  openedAt: string;
  completedAt?: string;
};

type ProjectWithActions = {
  kind: string;
  status: string;
  actions: ProjectActionWithDates[];
};

function localDateKey(reference: Date) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isProjectActionPastCheckIn(action: ProjectActionWithDates, reference = new Date()) {
  return Boolean(!action.completedAt && action.targetDate && action.targetDate < localDateKey(reference));
}

export function isProjectPastCheckIn(item: ProjectWithActions, reference = new Date()) {
  if (item.kind !== "project" || ["waiting", "completed", "archived"].includes(item.status)) return false;
  return item.actions.some((action) => isProjectActionPastCheckIn(action, reference));
}
