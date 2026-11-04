-- Cover organization-scoped foreign keys for predictable delete/update performance.
create index if not exists product_attributes_org_idx on public.product_attributes(organization_id);
create index if not exists product_attributes_product_org_idx on public.product_attributes(product_id, organization_id);
create index if not exists product_attribute_values_org_idx on public.product_attribute_values(organization_id);
create index if not exists product_attribute_values_attr_product_org_idx on public.product_attribute_values(attribute_id, product_id, organization_id);
create index if not exists product_variants_org_idx on public.product_variants(organization_id);
create index if not exists product_variants_product_org_idx on public.product_variants(product_id, organization_id);
create index if not exists product_variant_values_org_idx on public.product_variant_values(organization_id);
create index if not exists product_variant_values_variant_product_org_idx on public.product_variant_values(variant_id, product_id, organization_id);
create index if not exists product_variant_values_attribute_product_org_idx on public.product_variant_values(attribute_id, product_id, organization_id);
create index if not exists product_variant_values_value_product_attr_org_idx on public.product_variant_values(attribute_value_id, product_id, attribute_id, organization_id);
create index if not exists product_keywords_org_idx on public.product_keywords(organization_id);
create index if not exists product_keywords_product_org_idx on public.product_keywords(product_id, organization_id);
create index if not exists monitoring_profiles_org_idx on public.monitoring_profiles(organization_id);
create index if not exists monitoring_profiles_product_org_idx on public.monitoring_profiles(product_id, organization_id);
