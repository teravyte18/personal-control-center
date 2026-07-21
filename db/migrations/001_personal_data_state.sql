create table if not exists personal_data_state (
  id text primary key,
  revision bigint not null default 0,
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  constraint personal_data_state_singleton check (id = 'primary')
);

insert into personal_data_state (id, revision, snapshot)
values (
  'primary',
  0,
  '{
    "items": [],
    "draft": {
      "location": "",
      "photoName": "",
      "happened": "",
      "wentWell": "",
      "difficult": "",
      "learned": "",
      "nextWeek": ""
    },
    "history": []
  }'::jsonb
)
on conflict (id) do nothing;

create table if not exists personal_data_imports (
  import_id text primary key,
  source_exported_at timestamptz not null,
  imported_at timestamptz not null default now()
);
