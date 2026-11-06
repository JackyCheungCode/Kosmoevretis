create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.seo_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.market_trend_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (event_type in ('info','success','warning','error')),
  stage text,
  message text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now()
);
create index if not exists seo_task_events_task_created_idx on public.seo_task_events(task_id, created_at desc);
create index if not exists seo_task_events_org_created_idx on public.seo_task_events(organization_id, created_at desc);
alter table public.seo_task_events enable row level security;
drop policy if exists "organization members can read seo task events" on public.seo_task_events;
create policy "organization members can read seo task events"
  on public.seo_task_events for select to authenticated
  using (private.is_org_member(organization_id));
revoke all on public.seo_task_events from anon, authenticated;
grant select on public.seo_task_events to authenticated;
grant all on public.seo_task_events to service_role;

create table if not exists public.seo_worker_config (
  id boolean primary key default true check (id),
  token_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.seo_worker_config enable row level security;
revoke all on public.seo_worker_config from anon, authenticated;
grant all on public.seo_worker_config to service_role;

create policy "deny direct access to seo worker config"
  on public.seo_worker_config for all to anon, authenticated
  using (false) with check (false);

create index if not exists market_trend_tasks_seo_worker_queue_idx
  on public.market_trend_tasks(created_at)
  where task_type = 'seo_audit' and status in ('queued','running') and deleted_at is null;
