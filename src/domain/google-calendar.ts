import { getCurrentProjectAction, type Item } from "@/domain/personal-data";
import type { PersonalDataMutation, PersonalDataSnapshot } from "@/domain/personal-data-snapshot";

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

function isActiveItem(item: Item) {
  return !["completed", "archived"].includes(item.status);
}

export function nextDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function buildGoogleCalendarProjections(snapshot: PersonalDataSnapshot): GoogleCalendarProjection[] {
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
      const action = getCurrentProjectAction(item);
      if (!action?.targetDate) continue;
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

export function mutationAffectsGoogleCalendar(mutation: PersonalDataMutation) {
  return !["update-review-draft", "complete-review"].includes(mutation.type);
}
