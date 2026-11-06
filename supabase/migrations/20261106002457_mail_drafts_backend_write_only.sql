-- Mail drafts are mutated through the authenticated mail-api only.
-- This prevents clients from forging a sent state or attaching drafts to another user's mailbox.
revoke insert, update, delete on public.mail_drafts from authenticated;
drop policy if exists mail_drafts_insert_own on public.mail_drafts;
drop policy if exists mail_drafts_update_own on public.mail_drafts;
drop policy if exists mail_drafts_delete_own on public.mail_drafts;
grant select on public.mail_drafts to authenticated;
