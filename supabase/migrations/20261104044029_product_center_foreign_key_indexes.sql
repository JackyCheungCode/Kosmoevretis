create index if not exists product_categories_parent_org_fk_idx
  on public.product_categories(parent_id, organization_id);
create index if not exists product_category_attribute_templates_definition_org_fk_idx
  on public.product_category_attribute_templates(definition_id, organization_id);
create index if not exists product_category_attribute_templates_category_org_fk_idx
  on public.product_category_attribute_templates(category_id, organization_id);
create index if not exists product_category_attribute_templates_org_fk_idx
  on public.product_category_attribute_templates(organization_id);
create index if not exists products_category_org_fk_idx
  on public.products(category_id, organization_id);