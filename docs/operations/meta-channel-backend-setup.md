# Meta channel backend setup

This runbook applies to the organization-isolated Meta configuration in `feat/global-trade-social-crm`. The CRM and initial Meta channel migrations are applied to Supabase project `npkesfmszokmlgnzqelb`. The new organization Meta App migration and updated Edge Function still require rollout; the currently deployed function is the earlier global-credential version.

## Required Supabase Edge Function secrets

Keep these platform secrets in the Supabase Edge Function secret manager. Never put them in Vite variables, source files, browser storage, or chat messages.

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Existing Supabase project URL (platform-injected) |
| `SUPABASE_ANON_KEY` | JWT validation client key (platform-injected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only database access (platform-injected; never expose to clients) |
| `SETTINGS_ENCRYPTION_KEY` | At least 32 characters; AES-GCM key material for Meta App secrets and channel tokens |
| `APP_ORIGIN` | Exact Kosmoevretis app origin used for OAuth completion redirects |

Meta App ID, App Secret, Webhook Verify Token, and Graph API Version are no longer global Edge Function secrets. Each organization Owner/Admin configures its own Meta Developer App in **系统设置 → 渠道集成 → Meta 应用配置**. App Secret and Verify Token are encrypted by the Edge Function and are never returned to the browser.

The callback URL is generated from the Supabase project URL:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/meta-api?action=oauth_callback
```

The webhook URL is:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/meta-api/webhook
```

Register both URLs in every organization's own Meta App. The Verify Token entered in that organization's settings must match the value configured in that Meta App.

## Deployment order

1. [Completed] Apply the CRM foundation migration and initial Meta channel integration migration.
2. [Completed] Apply `20261106170000_organization_meta_app_configs.sql` to project `npkesfmszokmlgnzqelb` and verify RLS plus service-role-only grants.
3. [Pending] Deploy the updated `meta-api` Edge Function with `verify_jwt=false`; it performs its own user/org authorization and validates Meta webhook signatures.
4. Confirm `SETTINGS_ENCRYPTION_KEY` and `APP_ORIGIN` are present in Edge Function secrets. Do not add global Meta App credentials.
5. Each organization Owner/Admin enters its App ID, App Secret, Verify Token, and currently supported Graph API version in the Settings center, then runs the credential test.
6. Register callback and webhook URLs in the organization's Meta Developer App; enable the required Page and WhatsApp webhook fields.
7. Complete Meta Business Verification and request App Review / Advanced Access for the permissions required by the actual use case.
8. Test with a development Business Portfolio, test Page, and WhatsApp test number before connecting production assets.

## Implemented API behavior

- `start_oauth`: requires a signed-in organization owner/admin, creates a 10-minute random single-use state bound to organization and user, then returns the Meta authorization URL.
- OAuth callback: claims the state once, exchanges the code server-side, discovers permitted Page or WABA assets, encrypts temporary tokens, and redirects to the asset-selection page.
- `list_oauth_assets`: returns authorized asset metadata only; never returns access tokens.
- `complete_connection`: validates the selected asset, consumes the state, stores the selected Page/WABA token using AES-GCM, and creates the organization-scoped connection.
- `list_connections` / `disconnect_connection`: return non-secret connection metadata and revoke local access by removing the stored token.
- `/webhook`: verifies GET subscription challenges and POST `X-Hub-Signature-256`; accepted events are deduplicated and persisted to the service-role-only event inbox before returning success.

## Not yet implemented

- Webhook event consumer and normalization into conversation/message rows.
- Provider subscription management and webhook field verification.
- WhatsApp Embedded Signup-specific onboarding flow.
- Message send, template management, opt-in evidence capture, delivery receipts, and human approval execution.
- Meta App Review / Business Verification. OAuth may fail or permissions may be unavailable until Meta approves the app and assets.

No message is sent by this integration foundation. AI-generated replies remain drafts until a separately reviewed, policy-aware approval/send workflow is delivered.
