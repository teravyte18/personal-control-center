const plannerInputCodes: Record<string,string> = {
  "Invalid proposed plan.": "proposal-invalid",
  "Invalid removal ID.": "removal-invalid",
  "Invalid proposed session.": "session-invalid",
  "Duplicate session change.": "duplicate-session-change",
  "A removed session is no longer movable.": "session-not-movable",
  "A proposed session is invalid or no longer movable.": "session-not-movable",
  "An existing session is no longer movable.": "session-not-movable",
  "A proposed change conflicts with another session.": "session-conflict",
  "Another scheduled session overlaps this block.": "session-overlap",
  "A proposed session ends after midnight.": "session-after-midnight",
  "Invalid session fields.": "session-invalid",
  "This session refers to work that is no longer open.": "work-not-open",
  "A fixed calendar commitment overlaps this block.": "calendar-conflict",
  "Request week does not match proposal.": "request-week-mismatch",
};

/** Maps known validation failures to a stable, non-sensitive planner API code. */
export function plannerSubmissionErrorCode(message: string) {
  return plannerInputCodes[message] ?? "proposal-invalid";
}
