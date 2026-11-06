-- Meta channel integration foundation. Review and apply through the approved Supabase migration workflow.
-- This migration is intentionally not applied by this change.

create table if not exists public.crm_channel_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('facebook_pages','whatsapp_business','messenger')),
  external_asset_id text not null,
  display_name text not null default '',
  status text not null default 'connected' check (status in ('pending','connected','error','revoked','disconnected')),
  scopes text[] not null default '{}',
  token_expires_at timestamptz,
  last_validated_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, provider, external_asset_id)
);
create index if not exists crm_channel_connections_org_provider_idx
  on public.crm_channel_connections (organization_id, provider, status);

create table if not exists public.crm_channel_credentials (
  connection_id uuid primary key references public.crm_channel_connections(id) on delete cascade,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  credential_version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.crm_channel_credentials enable row level security;
revoke all on public.crm_channel_credentials from public, anon, authenticated;
grant all on public.crm_channel_credentials to service_role;
create policy crm_channel_credentials_service_role_access
  on public.crm_channel_credentials for all to service_role using (true) with check (true);

create table if not exists public.crm_channel_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('facebook_pages','whatsapp_business','messenger')),
  requested_scopes text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','processing','assets_ready','consumed','failed')),
  access_token_ciphertext text,
  access_token_iv text,
  token_expires_at timestamptz,
  discovered_assets jsonb not null default '[]'::jsonb check (jsonb_typeof(discovered_assets) = 'array'),\n  asset_tokens_ciphertext text,\n  asset_tokens_iv text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((access_token_ciphertext is null) = (access_token_iv is null)),\n  check ((asset_tokens_ciphertext is null) = (asset_tokens_iv is null))
);
alter table public.crm_channel_oauth_states enable row level security;
revoke all on public.crm_channel_oauth_states from public, anon, authenticated;
grant all on public.crm_channel_oauth_states to service_role;
create policy crm_channel_oauth_states_service_role_access
  on public.crm_channel_oauth_states for all to service_role using (true) with check (true);
create index if not exists crm_channel_oauth_states_expiry_idx
  on public.crm_channel_oauth_states (expires_at) where status in ('pending','assets_ready');

create table if not exists public.crm_channel_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  connection_id uuid references public.crm_channel_connections(id) on delete set null,
  provider text not null check (provider in ('facebook_pages','whatsapp_business','messenger')),
  dedupe_key text not null unique,
  provider_event_id text,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  processing_status text not null default 'queued' check (processing_status in ('queued','processing','processed','retry','quarantined')),
  retry_count integer not null default 0 check (retry_count >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error_code text,
  last_error_message text
);
alter table public.crm_channel_webhook_events enable row level security;
revoke all on public.crm_channel_webhook_events from public, anon, authenticated;
grant all on public.crm_channel_webhook_events to service_role;
create policy crm_channel_webhook_events_service_role_access
  on public.crm_channel_webhook_events for all to service_role using (true) with check (true);
create index if not exists crm_channel_webhook_events_queue_idx
  on public.crm_channel_webhook_events (processing_status, received_at);

alter table public.crm_contacts add constraint crm_contacts_id_org_unique unique (id, organization_id);\nalter table public.crm_leads add constraint crm_leads_id_org_unique unique (id, organization_id);\n\ncreate table if not exists public.crm_channel_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null,
  channel text not null check (channel in ('facebook_pages','whatsapp_business','messenger')),
  external_conversation_id text not null,
  external_contact_id text,
  participant_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(participant_summary) = 'object'),
  company_id uuid,
  contact_id uuid,
  lead_id uuid,
  status text not null default 'open' check (status in ('open','pending','closed','archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (connection_id, external_conversation_id),
  foreign key (connection_id, organization_id)
    references public.crm_channel_connections(id, organization_id) on delete cascade,
  foreign key (company_id, organization_id)
    references public.crm_companies(id, organization_id) on delete set null (company_id),
  foreign key (contact_id, organization_id)
    references public.crm_contacts(id, organization_id) on delete set null (contact_id),
  foreign key (lead_id, organization_id)
    references public.crm_leads(id, organization_id) on delete set null (lead_id)
);
create index if not exists crm_channel_conversations_inbox_idx
  on public.crm_channel_conversations (organization_id, channel, last_message_at desc);

create table if not exists public.crm_channel_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  connection_id uuid not null,
  provider_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  sender_external_id text,
  body_text text not null default '',
  attachment_metadata jsonb not null default '[]'::jsonb check (jsonb_typeof(attachment_metadata) = 'array'),
  delivery_status text not null default 'received' check (delivery_status in ('received','pending_approval','approved','sending','sent','delivered','read','failed')),
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, organization_id)
    references public.crm_channel_conversations(id, organization_id) on delete cascade,
  foreign key (connection_id, organization_id)
    references public.crm_channel_connections(id, organization_id) on delete cascade
);
create unique index if not exists crm_channel_messages_provider_id_uidx
  on public.crm_channel_messages (connection_id, provider_message_id)
  where provider_message_id is not null;
create index if not exists crm_channel_messages_conversation_time_idx
  on public.crm_channel_messages (conversation_id, created_at desc);

create table if not exists public.crm_channel_message_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body_text text not null check (char_length(body_text) between 1 and 10000),
  language text,
  ai_generated boolean not null default false,
  approval_status text not null default 'draft' check (approval_status in ('draft','pending_approval','approved','rejected','cancelled','sending','sent','failed')),
  approver_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  provider_message_id text,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (conversation_id, organization_id)
    references public.crm_channel_conversations(id, organization_id) on delete cascade
);
create index if not exists crm_channel_message_drafts_org_status_idx
  on public.crm_channel_message_drafts (organization_id, approval_status, updated_at desc);

create table if not exists public.crm_channel_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  connection_id uuid references public.crm_channel_connections(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists crm_channel_audit_logs_org_time_idx
  on public.crm_channel_audit_logs (organization_id, created_at desc);

alter table public.crm_channel_connections enable row level security;
alter table public.crm_channel_conversations enable row level security;
alter table public.crm_channel_messages enable row level security;
alter table public.crm_channel_message_drafts enable row level security;
alter table public.crm_channel_audit_logs enable row level security;

create policy crm_channel_connections_read_member on public.crm_channel_connections
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_conversations_read_member on public.crm_channel_conversations
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_messages_read_member on public.crm_channel_messages
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_message_drafts_read_member on public.crm_channel_message_drafts
  for select to authenticated using (private.is_org_member(organization_id));
create policy crm_channel_audit_logs_read_member on public.crm_channel_audit_logs
  for select to authenticated using (private.is_org_member(organization_id));

grant select on public.crm_channel_connections, public.crm_channel_conversations,
  public.crm_channel_messages, public.crm_channel_message_drafts, public.crm_channel_audit_logs
  to authenticated;
