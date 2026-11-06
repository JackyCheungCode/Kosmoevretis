-- Meta channel business operations: Facebook Page publishing, comments, templates and consent evidence.
-- Additive migration. Secrets and provider tokens remain in private/service-role storage.

create table if not exists public.crm_channel_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  channel text not null check (channel in ('facebook_pages','instagram_business')),
  external_post_id text,
  content_text text not null default '' check (char_length(content_text) <= 63206),
  media_items jsonb not null default '[]'::jsonb check (jsonb_typeof(media_items) = 'array'),
  link_url text,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed','cancelled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  permalink_url text,
  provider_response jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_response) = 'object'),
  last_error_code text,
  last_error_message text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (connection_id, organization_id)
    references public.crm_channel_connections(id, organization_id) on delete cascade
);
create unique index if not exists crm_channel_posts_external_uidx
  on public.crm_channel_posts(connection_id, external_post_id);
create index if not exists crm_channel_posts_org_status_idx
  on public.crm_channel_posts(organization_id, status, created_at desc);
create index if not exists crm_channel_posts_schedule_idx
  on public.crm_channel_posts(status, scheduled_at) where status = 'scheduled';

create table if not exists public.crm_channel_post_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  post_id uuid,
  external_post_id text not null,
  external_comment_id text not null,
  parent_external_comment_id text,
  author_external_id text,
  author_name text,
  message_text text not null default '',
  permalink_url text,
  moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden','deleted','replied')),
  provider_created_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (connection_id, organization_id)
    references public.crm_channel_connections(id, organization_id) on delete cascade,
  foreign key (post_id, organization_id)
    references public.crm_channel_posts(id, organization_id) on delete set null (post_id),
  unique (connection_id, external_comment_id)
);
create index if not exists crm_channel_post_comments_post_idx
  on public.crm_channel_post_comments(organization_id, external_post_id, provider_created_at desc);

create table if not exists public.crm_channel_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  provider_template_id text,
  template_name text not null,
  language_code text not null default 'en',
  category text,
  status text not null default 'unknown' check (status in ('unknown','pending','approved','rejected','paused','disabled')),
  components jsonb not null default '[]'::jsonb check (jsonb_typeof(components) = 'array'),
  quality_rating text,
  last_synced_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (connection_id, organization_id)
    references public.crm_channel_connections(id, organization_id) on delete cascade,
  unique (connection_id, template_name, language_code)
);
create index if not exists crm_channel_templates_org_status_idx
  on public.crm_channel_templates(organization_id, status, template_name);

create table if not exists public.crm_channel_recipient_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  channel text not null check (channel in ('whatsapp_business','messenger')),
  external_recipient_id text not null,
  contact_id uuid,
  consent_status text not null check (consent_status in ('opted_in','opted_out','unknown')),
  purpose text not null default 'customer_service',
  source text not null default 'manual',
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  captured_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (connection_id, organization_id)
    references public.crm_channel_connections(id, organization_id) on delete cascade,
  foreign key (contact_id, organization_id)
    references public.crm_contacts(id, organization_id) on delete set null (contact_id)
);
create unique index if not exists crm_channel_recipient_consents_current_uidx
  on public.crm_channel_recipient_consents(connection_id, external_recipient_id, purpose);
create index if not exists crm_channel_recipient_consents_org_status_idx
  on public.crm_channel_recipient_consents(organization_id, channel, consent_status);

alter table public.crm_channel_posts enable row level security;
alter table public.crm_channel_post_comments enable row level security;
alter table public.crm_channel_templates enable row level security;
alter table public.crm_channel_recipient_consents enable row level security;

create policy crm_channel_posts_read_member on public.crm_channel_posts
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_posts_create_member on public.crm_channel_posts
  for insert to authenticated with check (private.is_org_member(organization_id));
create policy crm_channel_posts_update_member on public.crm_channel_posts
  for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy crm_channel_posts_delete_admin on public.crm_channel_posts
  for delete to authenticated using (private.is_org_admin(organization_id));

create policy crm_channel_post_comments_read_member on public.crm_channel_post_comments
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_templates_read_member on public.crm_channel_templates
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_recipient_consents_read_member on public.crm_channel_recipient_consents
  for select to authenticated using (private.is_org_member(organization_id));

grant select, insert, update, delete on public.crm_channel_posts to authenticated;
grant select on public.crm_channel_post_comments, public.crm_channel_templates, public.crm_channel_recipient_consents to authenticated;
grant all on public.crm_channel_posts, public.crm_channel_post_comments, public.crm_channel_templates, public.crm_channel_recipient_consents to service_role;
