create table users (
  id text primary key,
  email text not null unique,
  created_at timestamptz not null default now(),
  constraint users_normalized_email check (email = lower(trim(email)))
);

insert into users (id, email)
values ('00000000-0000-4000-8000-000000000001', 'owner@local.invalid');

alter table personal_data_state
  drop constraint personal_data_state_singleton;

alter table personal_data_state
  add column user_id text;

update personal_data_state
set user_id = '00000000-0000-4000-8000-000000000001'
where user_id is null;

alter table personal_data_state
  alter column user_id set not null,
  drop constraint personal_data_state_pkey,
  drop column id,
  add constraint personal_data_state_pkey primary key (user_id),
  add constraint personal_data_state_user_fk foreign key (user_id) references users(id) on delete cascade;

alter table personal_data_imports
  add column user_id text;

update personal_data_imports
set user_id = '00000000-0000-4000-8000-000000000001'
where user_id is null;

alter table personal_data_imports
  alter column user_id set not null,
  drop constraint personal_data_imports_pkey,
  add constraint personal_data_imports_pkey primary key (user_id, import_id),
  add constraint personal_data_imports_user_fk foreign key (user_id) references users(id) on delete cascade;
