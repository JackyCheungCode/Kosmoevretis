drop policy if exists "members can create research task executions" on public.research_task_executions;
drop policy if exists "members can update research task executions" on public.research_task_executions;

create policy "members can create research task executions"
  on public.research_task_executions
  for insert to authenticated
  with check (
    private.is_org_member(organization_id)
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.market_trend_tasks as task
      where task.id = research_task_executions.task_id
        and task.organization_id = research_task_executions.organization_id
    )
  );

create policy "members can update research task executions"
  on public.research_task_executions
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (
    private.is_org_member(organization_id)
    and exists (
      select 1 from public.market_trend_tasks as task
      where task.id = research_task_executions.task_id
        and task.organization_id = research_task_executions.organization_id
    )
  );

revoke all on table public.research_task_executions from anon, authenticated, public;
grant select, insert, update on table public.research_task_executions to authenticated;
grant all on table public.research_task_executions to service_role;

create index if not exists research_task_executions_created_by_idx
  on public.research_task_executions(created_by);

create index if not exists market_trend_tasks_deleted_by_idx
  on public.market_trend_tasks(deleted_by);
