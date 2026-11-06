-- Service-only credential storage for authenticated mail-api operations.
create table public.mail_account_credentials (
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
alter table public.mail_account_credentials enable row level security;
revoke all on public.mail_account_credentials from public, anon, authenticated;
grant all on public.mail_account_credentials to service_role;
create policy mail_credentials_service_role_access on public.mail_account_credentials
for all to service_role using (true) with check (true);
