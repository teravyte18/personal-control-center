-- Reviewable assistant drafts are separate from the canonical snapshot. Every
-- lookup and transition is scoped by the authenticated owner.
create table planner_proposals (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  request_id uuid,
  snapshot_revision bigint not null,
  replace_from date not null,
  rationale text not null check (char_length(rationale) between 1 and 4000),
  changes jsonb not null,
  status text not null default 'draft' check (status in ('draft','approved','rejected','conflict')),
  conflict_reason text not null default '',
  applied_revision bigint,
  calendar_sync jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, request_id),
  foreign key (request_id) references planner_requests(id) on delete set null
);
create index planner_proposals_user_created_idx on planner_proposals(user_id, created_at desc);
