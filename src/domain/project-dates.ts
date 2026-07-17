import { getCurrentProjectAction, type Item, type ProjectAction } from "@/domain/personal-data";

function localDateKey(reference: Date) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isProjectActionPastCheckIn(action: ProjectAction, reference = new Date()) {
  return Boolean(!action.completedAt && action.targetDate && action.targetDate < localDateKey(reference));
}

export function isProjectPastCheckIn(item: Item, reference = new Date()) {
  if (item.kind !== "project" || ["completed", "archived"].includes(item.status)) return false;
  const currentAction = getCurrentProjectAction(item);
  return Boolean(currentAction && isProjectActionPastCheckIn(currentAction, reference));
}
