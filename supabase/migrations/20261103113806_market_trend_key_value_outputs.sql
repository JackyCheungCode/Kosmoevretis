alter table public.market_trend_tasks
  add column key_value_store_id text,
  add column kv_records jsonb not null default '[]'::jsonb
    check (jsonb_typeof(kv_records) = 'array');
