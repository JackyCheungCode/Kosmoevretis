-- Keep encrypted mailbox credentials available only to trusted backend functions.
create policy mail_credentials_service_role_access
on private.mail_account_credentials
for all to service_role
using (true) with check (true);
