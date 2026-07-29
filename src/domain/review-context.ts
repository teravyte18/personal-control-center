import { getOpenProjectActions, isOpenTask, isProjectActionTargetReached, projectRequiresNextAction, type Item } from "@/domain/personal-data";
import { formatLocalDate, isTimestampInReviewPeriod, type ReviewPeriod } from "@/domain/weekly-review";

export type ReviewLine = { id: string; text: string; detail?: string };

export function buildReviewContext(items: Item[], period: ReviewPeriod) {
  const openedActions: ReviewLine[] = [];
  const completedActions: ReviewLine[] = [];
  const attention: ReviewLine[] = [];

  for (const project of items.filter((item) => item.kind === "project" && item.status !== "archived")) {
    const openActions = getOpenProjectActions(project);
    if (projectRequiresNextAction(project) && openActions.length === 0) {
      attention.push({ id: `${project.id}-missing`, text: project.title, detail: "Has no open actions" });
    }

    for (const action of openActions) {
      if (action.targetDate && isProjectActionTargetReached(action)) {
        attention.push({ id: action.id, text: `${project.title}: ${action.title}`, detail: `Check-in reached ${formatDate(action.targetDate)}` });
      }
    }

    for (const action of project.actions) {
      if (isTimestampInReviewPeriod(action.openedAt, period)) {
        openedActions.push({ id: `${action.id}-opened`, text: `${project.title}: ${action.title}`, detail: action.targetDate ? `Check in ${formatDate(action.targetDate)}` : "No check-in date" });
      }
      if (isTimestampInReviewPeriod(action.completedAt, period)) {
        completedActions.push({ id: `${action.id}-completed`, text: `${project.title}: ${action.title}`, detail: action.completionNote || undefined });
      }
    }
  }

  return {
    attention,
    openedActions,
    completedActions,
    completedProjects: items.filter((item) => item.kind === "project" && isTimestampInReviewPeriod(item.completedAt, period)),
    openTasks: items.filter((item) => isOpenTask(item) && formatLocalDate(new Date(item.createdAt)) <= period.end),
    completedTasks: items.filter((item) => item.kind === "task" && isTimestampInReviewPeriod(item.completedAt, period)),
    thoughts: items.filter((item) => ["thought", "note"].includes(item.kind) && item.status !== "archived" && isTimestampInReviewPeriod(item.createdAt, period)),
  };
}

export function formatDate(value: string) {
  if (!value) return "No date";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
