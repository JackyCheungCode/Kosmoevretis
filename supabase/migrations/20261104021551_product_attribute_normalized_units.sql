alter table public.product_attribute_values add column if not exists normalized_unit text;
comment on column public.product_attribute_values.normalized_number is 'Canonical numeric value used for cross-listing comparisons.';
comment on column public.product_attribute_values.normalized_unit is 'Canonical unit corresponding to normalized_number.';
