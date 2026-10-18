-- Music preferences and cached public tags are scoped to the authenticated PCC user.
alter table spotify_connections
  add column playlist_scopes_granted boolean not null default false;

create table spotify_archive_settings (
  user_id text primary key references users(id) on delete cascade,
  playlist_id text not null,
  threshold integer not null default 5 check (threshold between 1 and 100),
  enabled boolean not null default false,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table spotify_archive_qualifications (
  user_id text not null,
  track_id text not null,
  first_qualified_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, track_id),
  foreign key (user_id, track_id) references spotify_tracks(user_id, track_id) on delete cascade
);

create table spotify_track_tags (
  user_id text not null,
  track_id text not null,
  tags text[] not null default '{}',
  fetched_at timestamptz not null default now(),
  primary key (user_id, track_id),
  foreign key (user_id, track_id) references spotify_tracks(user_id, track_id) on delete cascade
);

create index spotify_archive_qualified_at_idx on spotify_archive_qualifications(user_id, first_qualified_at);
