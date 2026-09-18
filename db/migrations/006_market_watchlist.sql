create table market_watchlist (
  user_id text not null references users(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol),
  constraint market_watchlist_symbol_length check (char_length(symbol) between 1 and 32)
);

create index market_watchlist_user_order_idx
  on market_watchlist (user_id, created_at, symbol);
