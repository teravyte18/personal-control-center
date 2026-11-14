-- User-owned queue for requests submitted from the Week Planner UI.
-- Agent may only read pending requests through the scoped planner credential.
create table planner_requests (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  week_start date not null,
  intent text not null check (intent in ('generate','replan')),
  instructions text not null default '' check (char_length(instructions) <= 2000),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index planner_requests_pending_idx on planner_requests(user_id, created_at)
  where processed_at is null;
