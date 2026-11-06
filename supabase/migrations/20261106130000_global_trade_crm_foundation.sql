-- P0 global trade CRM foundation. Apply through a reviewed Supabase migration workflow.
create table if not exists public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  website text,
  website_normalized text,
  country text,
  industry text,
  company_type text not null default 'unknown' check (company_type in ('brand','manufacturer','distributor','retailer','importer','wholesaler','other','unknown')),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index if not exists crm_companies_org_website_unique
  on public.crm_companies (organization_id, website_normalized)
  where website_normalized is not null and website_normalized <> '';
create index if not exists crm_companies_org_name_idx on public.crm_companies (organization_id, name);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 200),
  job_title text,
  email text,
  phone text,
  country text,
  preferred_language text,
  source text not null default 'manual',
  external_id text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contacts_company_org_fk foreign key (company_id, organization_id)
    references public.crm_companies(id, organization_id) on delete cascade
);
create index if not exists crm_contacts_org_company_idx on public.crm_contacts (organization_id, company_id);
create index if not exists crm_contacts_org_email_idx on public.crm_contacts (organization_id, lower(email)) where email is not null;

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  contact_id uuid,
  source text not null default 'manual' check (source in ('manual','facebook','instagram','linkedin','google_maps','whatsapp','messenger','website','trade_show','referral','other')),
  source_url text,
  source_record jsonb not null default '{}'::jsonb check (jsonb_typeof(source_record) = 'object'),
  product_interest text,
  intent_summary text,
  status text not null default 'new' check (status in ('new','qualified','contacted','negotiating','converted','disqualified')),
  score integer not null default 0 check (score between 0 and 100),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_leads_company_org_fk foreign key (company_id, organization_id)
    references public.crm_companies(id, organization_id) on delete cascade,
  constraint crm_leads_contact_org_fk foreign key (contact_id, organization_id)
    references public.crm_contacts(id, organization_id) on delete set null
);
create index if not exists crm_leads_org_created_idx on public.crm_leads (organization_id, created_at desc);
create index if not exists crm_leads_org_status_idx on public.crm_leads (organization_id, status);
create index if not exists crm_leads_org_company_idx on public.crm_leads (organization_id, company_id);

create table if not exists public.crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  lead_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  stage text not null default 'discovery' check (stage in ('discovery','qualified','sampling','quotation','negotiation','won','lost')),
  amount numeric(14,2),
  currency char(3),
  expected_close_date date,
  owner_id uuid references auth.users(id) on delete set null,
  next_step text,
  loss_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_opportunities_company_org_fk foreign key (company_id, organization_id)
    references public.crm_companies(id, organization_id) on delete cascade,
  constraint crm_opportunities_lead_org_fk foreign key (lead_id, organization_id)
    references public.crm_leads(id, organization_id) on delete set null
);
create index if not exists crm_opportunities_org_stage_idx on public.crm_opportunities (organization_id, stage, updated_at desc);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  lead_id uuid,
  contact_id uuid,
  channel text not null default 'internal' check (channel in ('internal','email','facebook','instagram','whatsapp','messenger','phone','meeting','other')),
  activity_type text not null default 'note' check (activity_type in ('note','call','meeting','email','message','follow_up','quote','sample','order','system')),
  subject text,
  body text not null default '',
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint crm_activities_company_org_fk foreign key (company_id, organization_id)
    references public.crm_companies(id, organization_id) on delete cascade,
  constraint crm_activities_lead_org_fk foreign key (lead_id, organization_id)
    references public.crm_leads(id, organization_id) on delete set null,
  constraint crm_activities_contact_org_fk foreign key (contact_id, organization_id)
    references public.crm_contacts(id, organization_id) on delete set null
);
create index if not exists crm_activities_org_company_time_idx on public.crm_activities (organization_id, company_id, occurred_at desc);

alter table public.crm_companies enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.crm_activities enable row level security;

create policy "CRM members can read companies" on public.crm_companies for select to authenticated using (private.is_org_member(organization_id));
create policy "CRM members can create companies" on public.crm_companies for insert to authenticated with check (private.is_org_member(organization_id));
create policy "CRM members can update companies" on public.crm_companies for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy "CRM admins can delete companies" on public.crm_companies for delete to authenticated using (private.is_org_admin(organization_id));

create policy "CRM members can read contacts" on public.crm_contacts for select to authenticated using (private.is_org_member(organization_id));
create policy "CRM members can create contacts" on public.crm_contacts for insert to authenticated with check (private.is_org_member(organization_id));
create policy "CRM members can update contacts" on public.crm_contacts for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy "CRM admins can delete contacts" on public.crm_contacts for delete to authenticated using (private.is_org_admin(organization_id));

create policy "CRM members can read leads" on public.crm_leads for select to authenticated using (private.is_org_member(organization_id));
create policy "CRM members can create leads" on public.crm_leads for insert to authenticated with check (private.is_org_member(organization_id));
create policy "CRM members can update leads" on public.crm_leads for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy "CRM admins can delete leads" on public.crm_leads for delete to authenticated using (private.is_org_admin(organization_id));

create policy "CRM members can read opportunities" on public.crm_opportunities for select to authenticated using (private.is_org_member(organization_id));
create policy "CRM members can create opportunities" on public.crm_opportunities for insert to authenticated with check (private.is_org_member(organization_id));
create policy "CRM members can update opportunities" on public.crm_opportunities for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy "CRM admins can delete opportunities" on public.crm_opportunities for delete to authenticated using (private.is_org_admin(organization_id));

create policy "CRM members can read activities" on public.crm_activities for select to authenticated using (private.is_org_member(organization_id));
create policy "CRM members can create activities" on public.crm_activities for insert to authenticated with check (private.is_org_member(organization_id));
create policy "CRM members can update activities" on public.crm_activities for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy "CRM admins can delete activities" on public.crm_activities for delete to authenticated using (private.is_org_admin(organization_id));

-- Explicit grants are required on projects where Data API table auto-exposure is disabled.
grant select, insert, update, delete on public.crm_companies, public.crm_contacts, public.crm_leads, public.crm_opportunities, public.crm_activities to authenticated;
