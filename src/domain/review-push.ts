export type ReviewPushContext = {
  localDate: string;
  localHour: number;
  weekday: number;
  periodStart: string;
  periodEnd: string;
  reminderDue: boolean;
};

const weekdayIds: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getReviewPushContext(reference: Date, timeZone: string): ReviewPushContext {
  if (!validTimeZone(timeZone)) throw new RangeError("A valid IANA timezone is required.");

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(reference);

  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = `${record.year}-${record.month}-${record.day}`;
  const weekday = weekdayIds[record.weekday] ?? -1;
  const localHour = Number(record.hour);
  if (weekday < 0 || !Number.isInteger(localHour)) throw new Error("Could not resolve local reminder time.");

  const openingDate = addDays(localDate, -((weekday + 1) % 7));
  return {
    localDate,
    localHour,
    weekday,
    periodStart: addDays(openingDate, -7),
    periodEnd: addDays(openingDate, -1),
    reminderDue: weekday !== 6 && localHour >= 8,
  };
}

export function reviewPeriodCompleted(
  history: readonly { periodStart?: string; periodEnd?: string }[],
  context: Pick<ReviewPushContext, "periodStart" | "periodEnd">,
) {
  return history.some((entry) => (
    entry.periodStart === context.periodStart && entry.periodEnd === context.periodEnd
  ));
}
