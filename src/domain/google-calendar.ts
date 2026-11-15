export type GoogleCalendarSourceType = "task" | "project-action" | "planner-session";

export type GoogleCalendarProjection = {
  sourceType: GoogleCalendarSourceType;
  sourceId: string;
  itemId: string;
  summary: string;
  description: string;
  date: string;
  start?: string;
  minutes?: number;
  timezone?: string;
};

export type GoogleCalendarEventBody = {
  summary: string;
  description: string;
  start: { date: string } | { dateTime: string; timeZone: string };
  end: { date: string } | { dateTime: string; timeZone: string };
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

type CalendarPlannerSession = {
  id: string;
  date: string;
  start: string;
  minutes: number;
  title: string;
  outcome?: string;
};
type CalendarSnapshot = {
  items: CalendarItem[];
  plannerSessions?: CalendarPlannerSession[];
  plannerPreferences?: { timezone?: string };
};
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

  // Planner sessions are canonical PCC records. Their stable session ID is the
  // Calendar mapping key, including unlinked sessions such as a daily check-in.
  const timezone = snapshot.plannerPreferences?.timezone ?? "Europe/Lisbon";
  for (const session of snapshot.plannerSessions ?? []) {
    if (session.outcome) continue;
    projections.push({
      sourceType: "planner-session",
      sourceId: session.id,
      itemId: session.id,
      summary: session.title,
      description: "Planner session from Personal Control Center",
      date: session.date,
      start: session.start,
      minutes: session.minutes,
      timezone,
    });
  }

  return projections.sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);
    return byDate || left.summary.localeCompare(right.summary) || left.sourceId.localeCompare(right.sourceId);
  });
}

export function buildGoogleCalendarEventBody(projection: GoogleCalendarProjection): GoogleCalendarEventBody {
  if (projection.sourceType === "planner-session") {
    const [hour, minute] = (projection.start ?? "09:00").split(":").map(Number);
    const finish = hour * 60 + minute + (projection.minutes ?? 30);
    const endDate = finish === 1440 ? nextDate(projection.date) : projection.date;
    const end = finish === 1440 ? "00:00:00" : `${String(Math.floor(finish / 60)).padStart(2, "0")}:${String(finish % 60).padStart(2, "0")}:00`;
    return {
      summary: projection.summary,
      description: projection.description,
      start: { dateTime: `${projection.date}T${projection.start ?? "09:00"}:00`, timeZone: projection.timezone ?? "Europe/Lisbon" },
      end: { dateTime: `${endDate}T${end}`, timeZone: projection.timezone ?? "Europe/Lisbon" },
      extendedProperties: {
        private: {
          pccSourceType: projection.sourceType,
          pccSourceId: projection.sourceId,
          pccItemId: projection.itemId,
        },
      },
    };
  }
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
    "add-rhythm-template",
    "update-rhythm-template",
    "delete-rhythm-template",
    "add-rhythm-completion",
    "delete-rhythm-completion",
    "add-weekly-focus",
    "remove-weekly-focus",
  ].includes(mutation.type);
}
