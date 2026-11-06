-- Mail communication foundation. Applied to Supabase project npkesfmszokmlgnzqelb.
-- Mailbox credentials are isolated in the non-exposed private schema.
create table public.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_key text not null check (provider_key in ('gmail','microsoft','imap_smtp')),
  email_address text not null,
  display_name text not null default '',
  status text not null default 'pending' check (status in ('pending','connected','syncing','error','revoked','disconnected')),
  is_default boolean not null default false,
  sync_window_days integer not null default 30 check (sync_window_days in (7,30,90)),
  sync_status text not null default 'not_started' check (sync_status in ('not_started','queued','running','succeeded','partial','failed')),
  last_sync_at timestamptz,
  last_error_code text,
  last_error_message text,
  provider_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index mail_accounts_user_provider_email_uidx on public.mail_accounts (organization_id, user_id, provider_key, lower(email_address));
create index mail_accounts_org_user_idx on public.mail_accounts (organization_id, user_id);

create table public.mail_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  provider_folder_id text not null,
  folder_key text,
  name text not null,
  unread_count integer not null default 0 check (unread_count >= 0),
  total_count integer not null default 0 check (total_count >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  updated_at timestamptz not null default now(),
  unique (account_id, provider_folder_id)
);
create index mail_folders_owner_idx on public.mail_folders (organization_id, user_id, account_id);

create table public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  folder_id uuid references public.mail_folders(id) on delete set null,
  provider_thread_id text not null,
  subject text not null default '',
  snippet text not null default '',
  participants jsonb not null default '[]'::jsonb check (jsonb_typeof(participants) = 'array'),
  message_count integer not null default 0 check (message_count >= 0),
  is_read boolean not null default false,
  is_starred boolean not null default false,
  last_message_at timestamptz,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, provider_thread_id)
);
create index mail_threads_inbox_idx on public.mail_threads (organization_id, user_id, account_id, last_message_at desc);
create index mail_threads_folder_idx on public.mail_threads (folder_id, last_message_at desc);

create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  thread_id uuid references public.mail_threads(id) on delete set null,
  provider_message_id text not null,
  direction text not null check (direction in ('inbound','outbound','draft')),
  from_email text not null default '',
  from_name text not null default '',
  to_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(to_recipients) = 'array'),
  cc_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(cc_recipients) = 'array'),
  bcc_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(bcc_recipients) = 'array'),
  subject text not null default '',
  body_text text not null default '',
  body_html text not null default '',
  headers jsonb not null default '{}'::jsonb check (jsonb_typeof(headers) = 'object'),
  is_read boolean not null default false,
  has_attachments boolean not null default false,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (account_id, provider_message_id)
);
create index mail_messages_thread_idx on public.mail_messages (thread_id, created_at);
create index mail_messages_owner_time_idx on public.mail_messages (organization_id, user_id, account_id, received_at desc);

create table public.mail_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  message_id uuid not null references public.mail_messages(id) on delete cascade,
  filename text not null,
  content_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text,
  content_id text,
  is_inline boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index mail_attachments_message_idx on public.mail_attachments (message_id);

create table public.mail_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  message_id uuid not null references public.mail_messages(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','succeeded','partial','failed')),
  classification text,
  intent text,
  summary text not null default '',
  extracted_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_fields) = 'object'),
  risk_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(risk_flags) = 'array'),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  reply_draft_text text,
  reply_language text,
  model_key text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id)
);
create index mail_ai_analyses_owner_idx on public.mail_ai_analyses (organization_id, user_id, created_at desc);

create table public.mail_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  thread_id uuid references public.mail_threads(id) on delete set null,
  in_reply_to_message_id uuid references public.mail_messages(id) on delete set null,
  to_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(to_recipients) = 'array'),
  cc_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(cc_recipients) = 'array'),
  bcc_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(bcc_recipients) = 'array'),
  subject text not null default '',
  body_text text not null default '',
  body_html text not null default '',
  ai_generated boolean not null default false,
  status text not null default 'draft' check (status in ('draft','queued','sending','sent','failed')),
  provider_message_id text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index mail_drafts_owner_idx on public.mail_drafts (organization_id, user_id, updated_at desc);

create table public.mail_sync_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.mail_accounts(id) on delete cascade,
  sync_kind text not null check (sync_kind in ('initial','incremental','folder','backfill')),
  cursor text,
  window_started_at timestamptz,
  last_synced_at timestamptz,
  status text not null default 'not_started' check (status in ('not_started','queued','running','succeeded','partial','failed')),
  error_code text,
  error_message text,
  updated_at timestamptz not null default now(),
  unique (account_id, sync_kind)
);
create index mail_sync_states_owner_idx on public.mail_sync_states (organization_id, user_id, account_id);

create table public.mail_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.mail_accounts(id) on delete set null,
  action text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index mail_audit_logs_owner_idx on public.mail_audit_logs (organization_id, user_id, created_at desc);

create schema if not exists private;
create table private.mail_account_credentials (
  account_id uuid primary key references public.mail_accounts(id) on delete cascade,
  access_token_ciphertext text,
  access_token_iv text,
  refresh_token_ciphertext text,
  refresh_token_iv text,
  password_ciphertext text,
  password_iv text,
  oauth_expires_at timestamptz,
  credential_version integer not null default 1,
  updated_at timestamptz not null default now(),
  check ((access_token_ciphertext is null) = (access_token_iv is null)),
  check ((refresh_token_ciphertext is null) = (refresh_token_iv is null)),
  check ((password_ciphertext is null) = (password_iv is null))
);
alter table private.mail_account_credentials enable row level security;
revoke all on private.mail_account_credentials from public, anon, authenticated;
grant all on private.mail_account_credentials to service_role;

alter table public.mail_accounts enable row level security;
alter table public.mail_folders enable row level security;
alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;
alter table public.mail_attachments enable row level security;
alter table public.mail_ai_analyses enable row level security;
alter table public.mail_drafts enable row level security;
alter table public.mail_sync_states enable row level security;
alter table public.mail_audit_logs enable row level security;

create policy mail_accounts_select_own on public.mail_accounts for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_folders_select_own on public.mail_folders for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_threads_select_own on public.mail_threads for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_messages_select_own on public.mail_messages for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_attachments_select_own on public.mail_attachments for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_ai_analyses_select_own on public.mail_ai_analyses for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_drafts_select_own on public.mail_drafts for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_drafts_insert_own on public.mail_drafts for insert to authenticated
with check (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_drafts_update_own on public.mail_drafts for update to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id))
with check (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_drafts_delete_own on public.mail_drafts for delete to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_sync_states_select_own on public.mail_sync_states for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy mail_audit_logs_select_own on public.mail_audit_logs for select to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id));

grant select on public.mail_accounts, public.mail_folders, public.mail_threads, public.mail_messages,
  public.mail_attachments, public.mail_ai_analyses, public.mail_sync_states, public.mail_audit_logs to authenticated;
grant select, insert, update, delete on public.mail_drafts to authenticated;
