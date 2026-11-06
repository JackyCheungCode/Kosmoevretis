-- Cover mail module foreign keys to keep joins and deletes efficient.
create index if not exists mail_accounts_user_fk_idx on public.mail_accounts(user_id);
create index if not exists mail_folders_user_fk_idx on public.mail_folders(user_id);
create index if not exists mail_threads_user_fk_idx on public.mail_threads(user_id);
create index if not exists mail_messages_user_fk_idx on public.mail_messages(user_id);
create index if not exists mail_attachments_org_fk_idx on public.mail_attachments(organization_id);
create index if not exists mail_attachments_user_fk_idx on public.mail_attachments(user_id);
create index if not exists mail_attachments_account_fk_idx on public.mail_attachments(account_id);
create index if not exists mail_ai_analyses_user_fk_idx on public.mail_ai_analyses(user_id);
create index if not exists mail_ai_analyses_account_fk_idx on public.mail_ai_analyses(account_id);
create index if not exists mail_drafts_user_fk_idx on public.mail_drafts(user_id);
create index if not exists mail_drafts_account_fk_idx on public.mail_drafts(account_id);
create index if not exists mail_drafts_thread_fk_idx on public.mail_drafts(thread_id);
create index if not exists mail_drafts_reply_message_fk_idx on public.mail_drafts(in_reply_to_message_id);
create index if not exists mail_sync_states_user_fk_idx on public.mail_sync_states(user_id);
create index if not exists mail_audit_logs_user_fk_idx on public.mail_audit_logs(user_id);
create index if not exists mail_audit_logs_account_fk_idx on public.mail_audit_logs(account_id);
