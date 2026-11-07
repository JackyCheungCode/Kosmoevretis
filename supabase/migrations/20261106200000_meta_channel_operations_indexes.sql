-- Cover new Meta operations foreign keys with indexes.
create index if not exists crm_channel_posts_connection_org_fk_idx
  on public.crm_channel_posts(connection_id, organization_id);
create index if not exists crm_channel_posts_created_by_idx
  on public.crm_channel_posts(created_by) where created_by is not null;
create index if not exists crm_channel_posts_updated_by_idx
  on public.crm_channel_posts(updated_by) where updated_by is not null;
create index if not exists crm_channel_post_comments_connection_org_fk_idx
  on public.crm_channel_post_comments(connection_id, organization_id);
create index if not exists crm_channel_post_comments_post_org_fk_idx
  on public.crm_channel_post_comments(post_id, organization_id) where post_id is not null;
create index if not exists crm_channel_templates_connection_org_fk_idx
  on public.crm_channel_templates(connection_id, organization_id);
create index if not exists crm_channel_recipient_consents_connection_org_fk_idx
  on public.crm_channel_recipient_consents(connection_id, organization_id);
create index if not exists crm_channel_recipient_consents_contact_org_fk_idx
  on public.crm_channel_recipient_consents(contact_id, organization_id) where contact_id is not null;
create index if not exists crm_channel_recipient_consents_created_by_idx
  on public.crm_channel_recipient_consents(created_by) where created_by is not null;
