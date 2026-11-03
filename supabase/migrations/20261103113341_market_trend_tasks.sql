create table public.market_trend_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  actor_id text not null default 'surefetch/google-trends',
  actor_run_id text,
  dataset_id text,
  status text not null default 'queued' check (status in ('queued','running','succeeded','partial','failed')),
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  raw_items jsonb not null default '[]'::jsonb check (jsonb_typeof(raw_items) = 'array'),
  result_count integer not null default 0 check (result_count >= 0),
  actor_meta jsonb not null default '{}'::jsonb check (jsonb_typeof(actor_meta) = 'object'),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index market_trend_tasks_org_created_idx on public.market_trend_tasks (organization_id, created_at desc);
create unique index market_trend_tasks_actor_run_uidx on public.market_trend_tasks (actor_run_id) where actor_run_id is not null;
alter table public.market_trend_tasks enable row level security;
create policy "members can read market trend tasks"
  on public.market_trend_tasks for select to authenticated
  using (private.is_org_member(organization_id));
create policy "members can create market trend tasks"
  on public.market_trend_tasks for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));
create policy "members can update market trend tasks"
  on public.market_trend_tasks for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
grant select, insert, update on public.market_trend_tasks to authenticated;
