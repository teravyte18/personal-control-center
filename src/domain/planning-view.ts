type CalendarEntry = { start: string; end: string; allDay: boolean; source: string };

/** Google all-day ends are exclusive local calendar dates, not UTC instants. */
export function upcomingCommitments<T extends CalendarEntry>(events: readonly T[], now = new Date()): T[] {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return events.filter(event => {
    if (event.source !== "google" && event.source !== "agenda") return false;
    return event.allDay ? event.end.slice(0, 10) > today : Date.parse(event.end) > now.getTime();
  }).sort((left, right) => {
    const localStart = (event: T) => Date.parse(event.allDay ? `${event.start.slice(0, 10)}T00:00:00` : event.start);
    return localStart(left) - localStart(right);
  });
}

export function weeklyWorkKey(source: { sourceType: string; sourceItemId: string; sourceActionId?: string }) {
  return JSON.stringify([source.sourceType, source.sourceItemId, source.sourceActionId ?? ""]);
}
