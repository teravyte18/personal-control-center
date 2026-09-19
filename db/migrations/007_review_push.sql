create table review_push_subscriptions (
  id bigserial primary key,
  user_id text not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null,
  last_review_reminder_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index review_push_subscriptions_user_id_idx
  on review_push_subscriptions(user_id);
