-- Cancellation is a durable tombstone: never destroy uncertain delivery custody.
alter table planner_requests
  add column cancelled_at timestamptz,
  add column dispatch_id uuid unique,
  add column dispatch_state text check (dispatch_state in ('unknown','accepted','committed')),
  add column dispatch_updated_at timestamptz,
  add constraint planner_dispatch_identity_check check (
    (dispatch_id is null and dispatch_state is null and dispatch_updated_at is null)
    or (dispatch_id is not null and dispatch_state is not null and dispatch_updated_at is not null)
  );
drop index planner_requests_pending_idx;
create index planner_requests_pending_idx on planner_requests(user_id, created_at)
  where processed_at is null and cancelled_at is null;
