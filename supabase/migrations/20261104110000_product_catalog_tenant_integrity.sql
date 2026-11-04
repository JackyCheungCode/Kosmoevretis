-- Enforce tenant ownership through composite foreign keys, not only client-supplied organization_id.
create unique index if not exists products_id_org_uidx on public.products(id, organization_id);
create unique index if not exists product_attributes_id_product_org_uidx on public.product_attributes(id, product_id, organization_id);
create unique index if not exists product_attribute_values_id_product_attr_org_uidx on public.product_attribute_values(id, product_id, attribute_id, organization_id);
create unique index if not exists product_variants_id_product_org_uidx on public.product_variants(id, product_id, organization_id);

alter table public.product_attributes
  add constraint product_attributes_product_org_fk
  foreign key (product_id, organization_id) references public.products(id, organization_id) on delete cascade;
alter table public.product_attribute_values
  add constraint product_attribute_values_attribute_org_fk
  foreign key (attribute_id, product_id, organization_id) references public.product_attributes(id, product_id, organization_id) on delete cascade;
alter table public.product_variants
  add constraint product_variants_product_org_fk
  foreign key (product_id, organization_id) references public.products(id, organization_id) on delete cascade;
alter table public.product_variant_values
  add constraint product_variant_values_variant_org_fk
  foreign key (variant_id, product_id, organization_id) references public.product_variants(id, product_id, organization_id) on delete cascade,
  add constraint product_variant_values_attribute_org_fk
  foreign key (attribute_id, product_id, organization_id) references public.product_attributes(id, product_id, organization_id) on delete cascade,
  add constraint product_variant_values_value_org_fk
  foreign key (attribute_value_id, product_id, attribute_id, organization_id)
  references public.product_attribute_values(id, product_id, attribute_id, organization_id) on delete restrict;
alter table public.product_keywords
  add constraint product_keywords_product_org_fk
  foreign key (product_id, organization_id) references public.products(id, organization_id) on delete cascade;
alter table public.monitoring_profiles
  add constraint monitoring_profiles_product_org_fk
  foreign key (product_id, organization_id) references public.products(id, organization_id) on delete cascade;
