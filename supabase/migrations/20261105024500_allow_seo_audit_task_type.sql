alter table public.market_trend_tasks drop constraint if exists market_trend_tasks_task_type_check;

alter table public.market_trend_tasks
  add constraint market_trend_tasks_task_type_check
  check (task_type = any (array[
    'google_trends',
    'keyword_research',
    'facebook_discovery',
    'linkedin_discovery',
    'google_maps_discovery',
    'ecommerce_discovery',
    'seo_audit'
  ]::text[]));
