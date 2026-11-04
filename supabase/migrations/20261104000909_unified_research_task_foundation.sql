alter table public.market_trend_tasks
  add column if not exists task_type text not null default 'google_trends',
  add column if not exists title text not null default '研究任务',
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.market_trend_tasks
  drop constraint if exists market_trend_tasks_status_check;

alter table public.market_trend_tasks
  add constraint market_trend_tasks_status_check
  check (status = any (array['queued','running','succeeded','partial','failed','cancelled']::text[]));

alter table public.market_trend_tasks
  drop constraint if exists market_trend_tasks_task_type_check;

alter table public.market_trend_tasks
  add constraint market_trend_tasks_task_type_check
  check (task_type = any (array['google_trends','keyword_research']::text[]));

update public.market_trend_tasks
set task_type = case
  when actor_id = 'habit.zhou/keyword-suggest-multi'
    or input_snapshot->>'researchType' = 'keyword-suggest-multi'
    then 'keyword_research'
  else 'google_trends'
end,
title = case
  when actor_id = 'habit.zhou/keyword-suggest-multi'
    or input_snapshot->>'researchType' = 'keyword-suggest-multi'
    then '关键词研究：' || coalesce(
      (select string_agg(seed.value, '、')
       from jsonb_array_elements_text(
         case when jsonb_typeof(input_snapshot->'seeds') = 'array'
           then input_snapshot->'seeds' else '[]'::jsonb end
       ) as seed(value)),
      '未命名'
    )
  else '市场趋势：' || coalesce(
      (select string_agg(keyword.value, '、')
       from jsonb_array_elements_text(
         case when jsonb_typeof(input_snapshot->'keywords') = 'array'
           then input_snapshot->'keywords' else '[]'::jsonb end
       ) as keyword(value)),
      '未命名'
    )
end;

create table public.research_task_executions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.market_trend_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  attempt_number integer not null check (attempt_number > 0),
  actor_id text not null,
  actor_run_id text,
  status text not null check (status = any (array['queued','running','succeeded','partial','failed','cancelled']::text[])),
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  dataset_id text,
  key_value_store_id text,
  raw_items jsonb not null default '[]'::jsonb check (jsonb_typeof(raw_items) = 'array'),
  kv_records jsonb not null default '[]'::jsonb check (jsonb_typeof(kv_records) = 'array'),
  result_count integer not null default 0 check (result_count >= 0),
  actor_meta jsonb not null default '{}'::jsonb check (jsonb_typeof(actor_meta) = 'object'),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, attempt_number)
);

create unique index research_task_executions_actor_run_uidx
  on public.research_task_executions(actor_run_id)
  where actor_run_id is not null;

create index research_task_executions_org_created_idx
  on public.research_task_executions(organization_id, created_at desc);

create index research_task_executions_task_attempt_idx
  on public.research_task_executions(task_id, attempt_number desc);

create index market_trend_tasks_org_type_status_idx
  on public.market_trend_tasks(organization_id, task_type, status, created_at desc);

create index market_trend_tasks_org_trash_idx
  on public.market_trend_tasks(organization_id, deleted_at, created_at desc);

create index market_trend_tasks_org_archive_idx
  on public.market_trend_tasks(organization_id, archived_at, created_at desc);

alter table public.research_task_executions enable row level security;

create policy "members can read research task executions"
  on public.research_task_executions
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy "members can create research task executions"
  on public.research_task_executions
  for insert to authenticated
  with check (
    private.is_org_member(organization_id)
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.market_trend_tasks task
      where task.id = task_id
        and task.organization_id = organization_id
    )
  );

create policy "members can update research task executions"
  on public.research_task_executions
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (
    private.is_org_member(organization_id)
    and exists (
      select 1 from public.market_trend_tasks task
      where task.id = task_id
        and task.organization_id = organization_id
    )
  );

revoke all on table public.research_task_executions from anon, public;
grant select, insert, update on table public.research_task_executions to authenticated;
grant all on table public.research_task_executions to service_role;
