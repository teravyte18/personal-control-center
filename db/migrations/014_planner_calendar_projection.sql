-- Planner sessions use the existing user-scoped source/event mapping. The
-- session ID remains the source ID so rescheduling updates its existing event.
alter table google_calendar_events
  drop constraint google_calendar_events_source_type_check;

alter table google_calendar_events
  add constraint google_calendar_events_source_type_check
  check (source_type in ('task', 'project-action', 'planner-session'));
