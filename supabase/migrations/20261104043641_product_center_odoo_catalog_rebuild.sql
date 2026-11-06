create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid,
  name text not null,
  slug text not null,
  code text,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, organization_id),
  unique(organization_id, slug),
  foreign key (parent_id, organization_id)
    references public.product_categories(id, organization_id) on delete restrict
);
create index if not exists product_categories_org_parent_idx
  on public.product_categories(organization_id, parent_id, sort_order, name);

create table if not exists public.product_category_attribute_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null,
  definition_id uuid not null,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (category_id, organization_id)
    references public.product_categories(id, organization_id) on delete cascade,
  foreign key (definition_id, organization_id)
    references public.product_attribute_definitions(id, organization_id) on delete cascade,
  unique(category_id, definition_id)
);
create index if not exists product_category_attribute_templates_category_idx
  on public.product_category_attribute_templates(category_id, sort_order);

alter table public.products
  add column if not exists category_id uuid,
  add column if not exists internal_reference text,
  add column if not exists barcode text,
  add column if not exists product_type text not null default 'physical',
  add column if not exists can_be_sold boolean not null default true,
  add column if not exists can_be_purchased boolean not null default true,
  add column if not exists sales_price numeric(14,2),
  add column if not exists sales_currency char(3) not null default 'USD',
  add column if not exists cost numeric(14,2),
  add column if not exists cost_currency char(3) not null default 'USD',
  add column if not exists unit_of_measure text not null default 'pcs',
  add column if not exists purchase_uom text not null default 'pcs',
  add column if not exists sales_description text,
  add column if not exists purchase_description text,
  add column if not exists weight numeric(12,3),
  add column if not exists volume numeric(12,4),
  add column if not exists country_of_origin text,
  add column if not exists hs_code text,
  add column if not exists manufacturer text,
  add column if not exists website_url text,
  add column if not exists release_date date,
  add column if not exists lifecycle_stage text not null default 'development',
  add column if not exists target_positioning text,
  add column if not exists key_selling_points text[] not null default '{}',
  add column if not exists version integer not null default 1;

alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_check
  check (product_type in ('physical','service','combo'));
alter table public.products drop constraint if exists products_lifecycle_stage_check;
alter table public.products add constraint products_lifecycle_stage_check
  check (lifecycle_stage in ('development','pre_launch','launched','active','discontinued'));
alter table public.products drop constraint if exists products_category_org_fk;
alter table public.products add constraint products_category_org_fk
  foreign key (category_id, organization_id)
  references public.product_categories(id, organization_id) on delete set null (category_id);

create unique index if not exists products_org_internal_reference_uidx
  on public.products(organization_id, internal_reference)
  where internal_reference is not null and internal_reference <> '';
create unique index if not exists products_org_barcode_uidx
  on public.products(organization_id, barcode)
  where barcode is not null and barcode <> '';

alter table public.product_variants
  add column if not exists image_url text,
  add column if not exists weight numeric(12,3),
  add column if not exists volume numeric(12,4);
create unique index if not exists product_variants_org_sku_uidx
  on public.product_variants(organization_id, sku)
  where sku is not null and sku <> '';
create unique index if not exists product_variants_org_barcode_uidx
  on public.product_variants(organization_id, barcode)
  where barcode is not null and barcode <> '';

do $$
declare t text;
begin
  foreach t in array array['product_categories','product_category_attribute_templates']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(organization_id))', t || '_members_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_org_member(organization_id))', t || '_members_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id))', t || '_members_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_org_member(organization_id))', t || '_members_delete', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

drop trigger if exists product_categories_touch_updated_at on public.product_categories;
create trigger product_categories_touch_updated_at before update on public.product_categories
for each row execute function private.touch_updated_at();

comment on table public.product_categories is 'Organization-scoped hierarchical product categories, separate from product attributes.';
comment on table public.product_category_attribute_templates is 'Category-specific attribute template assignments used to initialize Odoo-style product templates.';
comment on column public.products.category_id is 'Primary normalized product category; category_path is retained for backward compatibility.';
comment on column public.products.version is 'Product master revision counter reserved for quotation and contract snapshots.';
