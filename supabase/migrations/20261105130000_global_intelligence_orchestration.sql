alter table public.market_trend_tasks
  drop constraint if exists market_trend_tasks_task_type_check;
alter table public.market_trend_tasks
  add constraint market_trend_tasks_task_type_check
  check (task_type = any (array[
    'google_trends','keyword_research','facebook_discovery','linkedin_discovery',
    'google_maps_discovery','ecommerce_discovery','seo_audit','platform_data_collection',
    'instagram_discovery','global_intelligence'
  ]::text[]));

create table if not exists public.market_intelligence_task_sources (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.market_trend_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.intelligence_data_sources(id) on delete restrict,
  source_slug text not null,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','partial','failed','unsupported')),
  child_task_id uuid references public.market_trend_tasks(id) on delete set null,
  result_count integer not null default 0 check (result_count >= 0),
  run_meta jsonb not null default '{}'::jsonb check (jsonb_typeof(run_meta) = 'object'),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, source_id)
);
create index if not exists market_intelligence_task_sources_org_idx
  on public.market_intelligence_task_sources (organization_id, task_id, status);

create table if not exists public.market_intelligence_evidence (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.market_trend_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.intelligence_data_sources(id) on delete set null,
  source_slug text not null,
  channel text not null,
  evidence_kind text not null
    check (evidence_kind in ('search_trend','product_listing','social_post','review','article','other')),
  evidence_type text not null default 'observed'
    check (evidence_type in ('observed','estimated','inferred')),
  title text not null default '',
  content_text text not null default '',
  source_url text,
  market_code text,
  language text,
  currency text,
  price numeric(16,4),
  rank_value numeric(16,4),
  rating numeric(6,3),
  review_count bigint,
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  raw_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_payload) = 'object'),
  evidence_hash text not null,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (task_id, source_slug, evidence_hash)
);
create index if not exists market_intelligence_evidence_task_idx
  on public.market_intelligence_evidence (organization_id, task_id, evidence_kind, collected_at desc);
create index if not exists market_intelligence_evidence_source_idx
  on public.market_intelligence_evidence (organization_id, source_slug, collected_at desc);
create index if not exists market_intelligence_evidence_market_idx
  on public.market_intelligence_evidence (organization_id, market_code, evidence_kind);

create table if not exists public.market_intelligence_ai_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.market_trend_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  analysis_mode text not null default 'all' check (analysis_mode in ('all','single','custom')),
  tab_key text not null default 'overview',
  model_key text not null,
  question text not null default '',
  answer text not null,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  source_slugs text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists market_intelligence_ai_reports_task_idx
  on public.market_intelligence_ai_reports (organization_id, task_id, created_at desc);

alter table public.market_intelligence_task_sources enable row level security;
alter table public.market_intelligence_evidence enable row level security;
alter table public.market_intelligence_ai_reports enable row level security;

drop policy if exists market_intelligence_task_sources_member_read on public.market_intelligence_task_sources;
create policy market_intelligence_task_sources_member_read
  on public.market_intelligence_task_sources for select to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists market_intelligence_evidence_member_read on public.market_intelligence_evidence;
create policy market_intelligence_evidence_member_read
  on public.market_intelligence_evidence for select to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists market_intelligence_ai_reports_member_read on public.market_intelligence_ai_reports;
create policy market_intelligence_ai_reports_member_read
  on public.market_intelligence_ai_reports for select to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists market_intelligence_ai_reports_member_insert on public.market_intelligence_ai_reports;
create policy market_intelligence_ai_reports_member_insert
  on public.market_intelligence_ai_reports for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));

grant select on public.market_intelligence_task_sources, public.market_intelligence_evidence,
  public.market_intelligence_ai_reports to authenticated;
grant insert on public.market_intelligence_ai_reports to authenticated;

insert into public.intelligence_data_sources
  (slug,channel,name,logo_url,website_url,description,market_codes,languages,status,sort_order,is_active)
values
  ('linkedin','社交媒体','LinkedIn','https://cdn.simpleicons.org/linkedin','https://www.linkedin.com',
   '专业内容、品牌动态、行业讨论与公司动态。',array['GLOBAL'],array['en'],'needs_auth',24,true),
  ('pinterest','社交媒体','Pinterest','https://cdn.simpleicons.org/pinterest','https://www.pinterest.com',
   '视觉趋势、产品灵感、收藏与内容热度信号。',array['GLOBAL'],array['en'],'needs_auth',25,true)
on conflict (slug) do update set
  channel=excluded.channel,name=excluded.name,logo_url=excluded.logo_url,website_url=excluded.website_url,
  description=excluded.description,market_codes=excluded.market_codes,languages=excluded.languages,
  is_active=true,updated_at=now();

insert into public.intelligence_source_connectors
  (source_id,name,connector_type,provider,actor_id,status,auth_required,capabilities,notes)
select id,'LinkedIn 公开内容搜索','apify_actor','Apify',
  'insights_data/linkedin-post-search-scraper-no-cookies','needs_auth',true,
  array['posts','engagement','company_mentions'],'执行时使用已配置的组织级 Apify 凭证。'
from public.intelligence_data_sources where slug='linkedin'
on conflict (source_id,name) do update set
  actor_id=excluded.actor_id,status=excluded.status,capabilities=excluded.capabilities,updated_at=now();

insert into public.intelligence_source_connectors
  (source_id,name,connector_type,provider,actor_id,status,auth_required,capabilities,notes)
select id,'Pinterest 公开内容搜索','apify_actor','Apify',
  'pro100chok/pinterest-scraper-all-in-one','needs_auth',true,
  array['pins','engagement','visual_topics'],'执行时使用已配置的组织级 Apify 凭证。'
from public.intelligence_data_sources where slug='pinterest'
on conflict (source_id,name) do update set
  actor_id=excluded.actor_id,status=excluded.status,capabilities=excluded.capabilities,updated_at=now();

insert into public.intelligence_source_capabilities
  (source_id,capability_key,label,description,evidence_type,availability_status,metric_keys)
select id,'posts','专业内容与品牌动态','公开帖子、公司动态和行业讨论','observed','needs_auth',array['posts','engagement']
from public.intelligence_data_sources where slug='linkedin'
on conflict (source_id,capability_key) do update set
  label=excluded.label,description=excluded.description,availability_status=excluded.availability_status,metric_keys=excluded.metric_keys;

insert into public.intelligence_source_capabilities
  (source_id,capability_key,label,description,evidence_type,availability_status,metric_keys)
select id,'pins','视觉趋势与产品灵感','公开 Pin 内容、收藏和主题线索','observed','needs_auth',array['pins','saves','engagement']
from public.intelligence_data_sources where slug='pinterest'
on conflict (source_id,capability_key) do update set
  label=excluded.label,description=excluded.description,availability_status=excluded.availability_status,metric_keys=excluded.metric_keys;
