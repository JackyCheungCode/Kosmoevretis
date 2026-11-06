-- Organization-isolated Meta Developer App credentials.
-- Secret material is encrypted by the Edge Function and never exposed through the Data API.
create table if not exists public.crm_meta_app_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  app_id text not null check (char_length(btrim(app_id)) between 1 and 128),
  app_secret_ciphertext text not null,
  app_secret_iv text not null,
  webhook_verify_token_ciphertext text not null,
  webhook_verify_token_iv text not null,
  graph_api_version text not null
    check (graph_api_version ~ '^v[0-9]+\.[0-9]+$'),
  enabled boolean not null default true,
  last_validated_at timestamptz,
  validation_status text not null default 'not_tested'
    check (validation_status in ('not_tested','valid','invalid')),
  validation_message text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((app_secret_ciphertext <> '') and (app_secret_iv <> '')),
  check ((webhook_verify_token_ciphertext <> '') and (webhook_verify_token_iv <> ''))
);
alter table public.crm_meta_app_configs enable row level security;
revoke all on public.crm_meta_app_configs from public, anon, authenticated;
grant all on public.crm_meta_app_configs to service_role;
create policy crm_meta_app_configs_service_role_access
  on public.crm_meta_app_configs for all to service_role using (true) with check (true);
