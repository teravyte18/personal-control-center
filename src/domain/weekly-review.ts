import type { ReviewDraft, ReviewEntry } from "@/domain/personal-data";

export type ReviewPeriod = {
  start: string;
  end: string;
  openedOn: string;
};

export function getCurrentReviewPeriod(reference = new Date()): ReviewPeriod {
  const opening = startOfLocalDay(reference);
  const daysSinceSaturday = (opening.getDay() + 1) % 7;
  opening.setDate(opening.getDate() - daysSinceSaturday);

  const periodStart = new Date(opening);
  periodStart.setDate(periodStart.getDate() - 7);
  const periodEnd = new Date(opening);
  periodEnd.setDate(periodEnd.getDate() - 1);

  return {
    start: formatLocalDate(periodStart),
    end: formatLocalDate(periodEnd),
    openedOn: formatLocalDate(opening),
  };
}

export function isReviewDraftForPeriod(draft: ReviewDraft, period: ReviewPeriod) {
  return draft.periodStart === period.start && draft.periodEnd === period.end;
}

export function isReviewCompletedForPeriod(history: ReviewEntry[], period: ReviewPeriod) {
  return history.some((entry) => entry.periodStart === period.start && entry.periodEnd === period.end);
}

export function isTimestampInReviewPeriod(timestamp: string | undefined, period: ReviewPeriod) {
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return false;
  const localDate = formatLocalDate(new Date(timestamp));
  return localDate >= period.start && localDate <= period.end;
}

export function isDateInReviewPeriod(date: string, period: ReviewPeriod) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= period.start && date <= period.end;
}

export function isReviewReminderDue(
  reference: Date,
  draft: ReviewDraft,
  history: ReviewEntry[],
) {
  const period = getCurrentReviewPeriod(reference);
  if (!isReviewDraftForPeriod(draft, period) || isReviewCompletedForPeriod(history, period)) return false;

  const day = reference.getDay();
  if (day === 6) return false;
  if (reference.getHours() < 8) return false;
  return true;
}

export function reviewReminderDateKey(reference: Date, period = getCurrentReviewPeriod(reference)) {
  return `${period.start}:${formatLocalDate(reference)}`;
}

export function formatReviewPeriod(period: ReviewPeriod, locale?: string) {
  const start = new Date(`${period.start}T12:00:00`);
  const end = new Date(`${period.end}T12:00:00`);
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatLocalDate(reference: Date) {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(reference: Date) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  return date;
}
