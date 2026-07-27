create table google_calendar_connections (
  user_id text primary key references users(id) on delete cascade,
  calendar_id text not null,
  encrypted_refresh_token text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text
);

create table google_calendar_events (
  user_id text not null references google_calendar_connections(user_id) on delete cascade,
  source_type text not null,
  source_id text not null,
  item_id text not null,
  event_id text not null,
  content_hash text not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, source_type, source_id),
  unique (user_id, event_id),
  constraint google_calendar_events_source_type_check
    check (source_type in ('task', 'project-action'))
);

create index google_calendar_events_user_id_idx on google_calendar_events(user_id);
