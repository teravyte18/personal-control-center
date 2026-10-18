-- Private, per-account Spotify listening data. No IPs, device IDs or raw exports.
create table spotify_connections (
  user_id text primary key references users(id) on delete cascade,
  encrypted_refresh_token text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_polled_at timestamptz,
  last_error text
);

create table spotify_tracks (
  user_id text not null references users(id) on delete cascade,
  track_id text not null,
  name text not null,
  artist text not null,
  album text not null default '',
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table spotify_play_events (
  user_id text not null,
  track_id text not null,
  played_at timestamptz not null,
  source text not null check (source in ('export', 'api')),
  ms_played integer check (ms_played is null or ms_played >= 0),
  primary key (user_id, track_id, played_at),
  foreign key (user_id, track_id) references spotify_tracks(user_id, track_id) on delete cascade
);

create index spotify_plays_user_date_idx on spotify_play_events (user_id, played_at desc);
create index spotify_plays_user_track_idx on spotify_play_events (user_id, track_id);
