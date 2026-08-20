export type GoogleCalendarSourceType = "task" | "project-action";

export type GoogleCalendarProjection = {
  sourceType: GoogleCalendarSourceType;
  sourceId: string;
  itemId: string;
  summary: string;
  description: string;
  date: string;
};

export type GoogleCalendarEventBody = {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  extendedProperties: {
    private: {
      pccSourceType: GoogleCalendarSourceType;
      pccSourceId: string;
      pccItemId: string;
    };
  };
};

type CalendarAction = {
  id: string;
  title: string;
  targetDate: string;
  openedAt: string;
  completedAt?: string;
};

type CalendarItem = {
  id: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  checkInDate?: string;
  actions: CalendarAction[];
};

type CalendarSnapshot = { items: CalendarItem[] };
type MutationLike = { type: string };

function isActiveItem(item: CalendarItem) {
  return !["completed", "archived"].includes(item.status);
}

export function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function buildGoogleCalendarProjections(snapshot: CalendarSnapshot): GoogleCalendarProjection[] {
  const projections: GoogleCalendarProjection[] = [];

  for (const item of snapshot.items) {
    if (!isActiveItem(item)) continue;

    if (item.kind === "task" && item.checkInDate) {
      projections.push({
        sourceType: "task",
        sourceId: item.id,
        itemId: item.id,
        summary: item.title,
        description: item.description.trim()
          ? `Task from Personal Control Center\n\n${item.description.trim()}`
          : "Task from Personal Control Center",
        date: item.checkInDate,
      });
      continue;
    }

    if (item.kind === "project") {
      for (const action of item.actions.filter((candidate) => !candidate.completedAt && candidate.targetDate)) {
        projections.push({
          sourceType: "project-action",
          sourceId: action.id,
          itemId: item.id,
          summary: action.title,
          description: `Project action from Personal Control Center\n\nProject: ${item.title}`,
          date: action.targetDate,
        });
      }
    }
  }

  return projections.sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);
    return byDate || left.summary.localeCompare(right.summary) || left.sourceId.localeCompare(right.sourceId);
  });
}

export function buildGoogleCalendarEventBody(projection: GoogleCalendarProjection): GoogleCalendarEventBody {
  return {
    summary: projection.summary,
    description: projection.description,
    start: { date: projection.date },
    end: { date: nextDate(projection.date) },
    extendedProperties: {
      private: {
        pccSourceType: projection.sourceType,
        pccSourceId: projection.sourceId,
        pccItemId: projection.itemId,
      },
    },
  };
}

export function mutationAffectsGoogleCalendar(mutation: MutationLike) {
  return ![
    "update-review-draft",
    "complete-review",
    "add-expense-transaction",
    "update-expense-transaction",
    "delete-expense-transaction",
    "update-expense-settings",
    "set-expense-reconciled-through",
  ].includes(mutation.type);
}
