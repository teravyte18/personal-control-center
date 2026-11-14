-- Opt-in planner-only agent capability. Existing read-only grants remain read-only.
alter table assistant_grants
  add column planner_write boolean not null default false;
