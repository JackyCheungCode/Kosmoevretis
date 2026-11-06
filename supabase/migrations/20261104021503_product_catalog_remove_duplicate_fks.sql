-- Composite tenant-aware foreign keys replace duplicate product-only relations.
alter table public.product_attributes drop constraint if exists product_attributes_product_id_fkey;
alter table public.product_attribute_values drop constraint if exists product_attribute_values_attribute_id_product_id_fkey;
alter table public.product_variants drop constraint if exists product_variants_product_id_fkey;
alter table public.product_variant_values
  drop constraint if exists product_variant_values_variant_id_product_id_fkey,
  drop constraint if exists product_variant_values_attribute_id_product_id_fkey,
  drop constraint if exists product_variant_values_attribute_value_id_product_id_attri_fkey;
alter table public.product_keywords drop constraint if exists product_keywords_product_id_fkey;
alter table public.monitoring_profiles drop constraint if exists monitoring_profiles_product_id_fkey;
