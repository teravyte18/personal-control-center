-- Independent read-only integration credentials. No canonical snapshot changes.
create table assistant_grants (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  token_hash text not null unique,
  domains text[] not null check (
    cardinality(domains) between 1 and 7 and
    domains <@ array['library','projects','tasks','rhythm','reviews','notes','thoughts']::text[]
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz
);
create index assistant_grants_user_idx on assistant_grants(user_id);
