alter table users
  add column role text,
  add column status text,
  add column password_hash text,
  add column invited_at timestamptz,
  add column activated_at timestamptz,
  add column revoked_at timestamptz;

update users
set role = case
      when id = '00000000-0000-4000-8000-000000000001' then 'owner'
      else 'member'
    end,
    status = case
      when id = '00000000-0000-4000-8000-000000000001' then 'active'
      else 'invited'
    end,
    invited_at = coalesce(invited_at, created_at),
    activated_at = case
      when id = '00000000-0000-4000-8000-000000000001' then coalesce(activated_at, now())
      else activated_at
    end;

alter table users
  alter column role set not null,
  alter column role set default 'member',
  alter column status set not null,
  alter column status set default 'invited',
  add constraint users_role_check check (role in ('owner', 'member')),
  add constraint users_status_check check (status in ('invited', 'active', 'revoked'));

create table auth_sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index auth_sessions_user_id_idx on auth_sessions(user_id);
create index auth_sessions_expires_at_idx on auth_sessions(expires_at);

create table user_invites (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  created_by_user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index user_invites_user_id_idx on user_invites(user_id);
create index user_invites_expires_at_idx on user_invites(expires_at);
