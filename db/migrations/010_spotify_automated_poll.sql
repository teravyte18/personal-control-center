-- Distinguish real scheduled worker requests from manual Spotify collection.
-- Null means no authorized background poll has reached the application.
alter table spotify_connections
  add column last_automated_poll_at timestamptz;
