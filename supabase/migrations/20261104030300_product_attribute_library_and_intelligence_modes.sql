create table public.product_attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  data_type text not null default 'text' check (data_type in ('text','number','single_select','multi_select','boolean','date','dimension')),
  unit text,
  attribute_group text not null default '规格参数',
  semantic_type text not null default 'specification' check (semantic_type in ('specification','marketing','compliance','commercial')),
  display_type text not null default 'select' check (display_type in ('select','radio','pills','color','multi_checkbox','image')),
  default_variant_creation_mode text not null default 'never' check (default_variant_creation_mode in ('instant','dynamic','never')),
  include_in_analysis boolean not null default true,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, organization_id),
  unique(organization_id, slug)
);
create index product_attribute_definitions_org_sort_idx on public.product_attribute_definitions(organization_id, sort_order, name);

create table public.product_attribute_definition_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  definition_id uuid not null,
  value_text text not null,
  value_number numeric,
  unit text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (definition_id, organization_id) references public.product_attribute_definitions(id, organization_id) on delete cascade,
  unique(id, definition_id, organization_id),
  unique(definition_id, value_text)
);
create index product_attribute_definition_values_sort_idx on public.product_attribute_definition_values(definition_id, sort_order);

alter table public.product_attributes
  add column definition_id uuid,
  add column variant_creation_mode text not null default 'never'
    check (variant_creation_mode in ('instant','dynamic','never')),
  add column include_in_analysis boolean not null default true,
  add column display_type text not null default 'select'
    check (display_type in ('select','radio','pills','color','multi_checkbox','image'));

update public.product_attributes
set variant_creation_mode = case when is_variant_axis then 'dynamic' else 'never' end;

alter table public.product_attributes
  add constraint product_attributes_id_product_org_definition_uk
    unique(id, product_id, organization_id, definition_id),
  add constraint product_attributes_definition_org_fk
    foreign key (definition_id, organization_id)
    references public.product_attribute_definitions(id, organization_id)
    on delete set null (definition_id);

alter table public.product_attribute_values
  add column definition_id uuid,
  add column definition_value_id uuid,
  add column include_in_analysis boolean not null default true,
  add constraint product_attribute_values_attribute_definition_fk
    foreign key (attribute_id, product_id, organization_id, definition_id)
    references public.product_attributes(id, product_id, organization_id, definition_id)
    on delete cascade,
  add constraint product_attribute_values_definition_value_fk
    foreign key (definition_value_id, definition_id, organization_id)
    references public.product_attribute_definition_values(id, definition_id, organization_id)
    on delete set null (definition_value_id, definition_id);

do $$
declare t text;
begin
  foreach t in array array['product_attribute_definitions','product_attribute_definition_values']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(organization_id))', t || '_members_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_org_member(organization_id))', t || '_members_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id))', t || '_members_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_org_member(organization_id))', t || '_members_delete', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

comment on table public.product_attribute_definitions is 'Reusable organization-scoped product attribute templates.';
comment on table public.product_attribute_definition_values is 'Reusable allowed values for organization-scoped product attribute templates.';
comment on column public.product_attributes.variant_creation_mode is 'Odoo-style variant behavior: instantly, dynamically, or never.';
comment on column public.product_attributes.include_in_analysis is 'Whether this attribute can be used as a global intelligence analysis dimension.';
