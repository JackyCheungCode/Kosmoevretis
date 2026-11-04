-- Product Catalog foundation: organization-scoped products, flexible attributes, variants and monitoring.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  brand text,
  model text,
  sku text,
  category_path text[] not null default '{}',
  description text,
  product_type text not null default 'physical',
  image_url text,
  target_markets text[] not null default '{}',
  target_audiences text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_org_updated_idx on public.products(organization_id, updated_at desc);
create index if not exists products_category_gin_idx on public.products using gin(category_path);

create table if not exists public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  slug text not null,
  data_type text not null default 'text' check (data_type in ('text','number','single_select','multi_select','boolean','date','dimension')),
  unit text,
  attribute_group text not null default '规格参数',
  semantic_type text not null default 'specification' check (semantic_type in ('specification','marketing','compliance','commercial')),
  is_required boolean not null default false,
  is_variant_axis boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, product_id)
);
create index if not exists product_attributes_product_idx on public.product_attributes(product_id, sort_order);

create table if not exists public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  attribute_id uuid not null,
  value_text text not null,
  value_number numeric,
  normalized_number numeric,
  unit text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (attribute_id, product_id) references public.product_attributes(id, product_id) on delete cascade,
  unique(id, product_id, attribute_id)
);
create index if not exists product_attribute_values_attr_idx on public.product_attribute_values(attribute_id, sort_order);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  model text,
  title text,
  barcode text,
  price numeric(14,2),
  currency char(3),
  cost numeric(14,2),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, product_id)
);
create index if not exists product_variants_product_idx on public.product_variants(product_id, created_at);

create table if not exists public.product_variant_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid not null,
  attribute_id uuid not null,
  attribute_value_id uuid not null,
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete cascade,
  foreign key (attribute_id, product_id) references public.product_attributes(id, product_id) on delete cascade,
  foreign key (attribute_value_id, product_id, attribute_id) references public.product_attribute_values(id, product_id, attribute_id) on delete restrict,
  unique(variant_id, attribute_id)
);
create index if not exists product_variant_values_variant_idx on public.product_variant_values(variant_id);

create table if not exists public.product_keywords (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  keyword text not null,
  keyword_type text not null default 'core' check (keyword_type in ('core','feature','scenario','competitor','model','pain_point','long_tail')),
  language_code text not null default 'en',
  market_code text,
  search_intent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(product_id, keyword, language_code, market_code)
);
create index if not exists product_keywords_product_idx on public.product_keywords(product_id, is_active);

create table if not exists public.monitoring_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  description text,
  markets text[] not null default '{}',
  languages text[] not null default '{}',
  platforms text[] not null default '{}',
  cadence text not null default 'weekly' check (cadence in ('daily','weekly','monthly','manual')),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists monitoring_profiles_product_idx on public.monitoring_profiles(product_id, is_active);

-- Keep update timestamps consistent with the existing project helper.
create trigger products_touch_updated_at before update on public.products
for each row execute function private.touch_updated_at();
create trigger product_attributes_touch_updated_at before update on public.product_attributes
for each row execute function private.touch_updated_at();
create trigger product_variants_touch_updated_at before update on public.product_variants
for each row execute function private.touch_updated_at();
create trigger monitoring_profiles_touch_updated_at before update on public.monitoring_profiles
for each row execute function private.touch_updated_at();

-- Every row is isolated to an organization; membership is checked centrally.
do $$
declare t text;
begin
  foreach t in array array['products','product_attributes','product_attribute_values','product_variants','product_variant_values','product_keywords','monitoring_profiles']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(organization_id))', t || '_members_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_org_member(organization_id))', t || '_members_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id))', t || '_members_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_org_member(organization_id))', t || '_members_delete', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

comment on table public.products is 'Organization-owned product master records used by all market intelligence modules.';
comment on table public.product_attributes is 'Flexible per-product attribute definitions; no category-specific hardcoded columns.';
comment on table public.product_attribute_values is 'Allowed or observed values for flexible product attributes, with raw and normalized numeric forms.';
comment on table public.product_variants is 'Real-world sellable product variants/SKUs; not every theoretical attribute combination.';
comment on table public.product_variant_values is 'Attribute values selected by an actual product variant.';
comment on table public.product_keywords is 'Multilingual and market-specific discovery and monitoring keywords.';
comment on table public.monitoring_profiles is 'Reusable market monitoring configuration attached to a product.';
