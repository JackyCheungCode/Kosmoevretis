create table if not exists public.intelligence_data_sources (
 id uuid primary key default gen_random_uuid(), slug text not null unique, channel text not null, name text not null,
 logo_url text not null, website_url text not null, description text not null, market_codes text[] not null default '{}',
 languages text[] not null default '{}', status text not null check(status in ('ready','needs_auth','limited','planned','error')),
 sort_order integer not null default 0, is_active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.intelligence_source_connectors (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.intelligence_data_sources(id) on delete cascade,
 name text not null, connector_type text not null check(connector_type in ('official_api','apify_actor','third_party','public_web')),
 provider text not null, actor_id text, status text not null check(status in ('ready','needs_auth','limited','planned','error')),
 auth_required boolean not null default true, capabilities text[] not null default '{}', notes text not null default '',
 input_schema jsonb not null default '{}'::jsonb, output_fields text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source_id,name)
);
create table if not exists public.intelligence_source_capabilities (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references public.intelligence_data_sources(id) on delete cascade,
 capability_key text not null, label text not null, description text not null, evidence_type text not null check(evidence_type in ('observed','estimated','inferred')),
 availability_status text not null check(availability_status in ('ready','needs_auth','limited','planned','error')),
 metric_keys text[] not null default '{}', created_at timestamptz not null default now(), unique(source_id,capability_key)
);
create table if not exists public.intelligence_demo_datasets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 slug text not null, name text not null, product_label text not null, is_demo boolean not null default true,
 dataset jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,slug)
);
create index if not exists intelligence_source_connectors_source_idx on public.intelligence_source_connectors(source_id,status);
create index if not exists intelligence_source_capabilities_source_idx on public.intelligence_source_capabilities(source_id,availability_status);
create index if not exists intelligence_demo_datasets_org_idx on public.intelligence_demo_datasets(organization_id,slug);
alter table public.intelligence_data_sources enable row level security;
alter table public.intelligence_source_connectors enable row level security;
alter table public.intelligence_source_capabilities enable row level security;
alter table public.intelligence_demo_datasets enable row level security;
drop policy if exists intelligence_sources_authenticated_read on public.intelligence_data_sources;
create policy intelligence_sources_authenticated_read on public.intelligence_data_sources for select to authenticated using (true);
drop policy if exists intelligence_connectors_authenticated_read on public.intelligence_source_connectors;
create policy intelligence_connectors_authenticated_read on public.intelligence_source_connectors for select to authenticated using (true);
drop policy if exists intelligence_capabilities_authenticated_read on public.intelligence_source_capabilities;
create policy intelligence_capabilities_authenticated_read on public.intelligence_source_capabilities for select to authenticated using (true);
drop policy if exists intelligence_demo_members_select on public.intelligence_demo_datasets;
create policy intelligence_demo_members_select on public.intelligence_demo_datasets for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists intelligence_demo_members_insert on public.intelligence_demo_datasets;
create policy intelligence_demo_members_insert on public.intelligence_demo_datasets for insert to authenticated with check (private.is_org_member(organization_id));
drop policy if exists intelligence_demo_members_update on public.intelligence_demo_datasets;
create policy intelligence_demo_members_update on public.intelligence_demo_datasets for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
grant select on public.intelligence_data_sources,public.intelligence_source_connectors,public.intelligence_source_capabilities to authenticated;
grant select,insert,update on public.intelligence_demo_datasets to authenticated;