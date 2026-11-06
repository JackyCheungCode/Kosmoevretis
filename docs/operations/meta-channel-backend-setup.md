# Meta channel backend setup

This runbook applies to the `feat/global-trade-social-crm` delivery. The CRM and Meta database migrations have been applied to Supabase project `npkesfmszokmlgnzqelb`; Edge Function `meta-api` is deployed as version 1 with custom authentication. Meta credentials, App Review, Business Verification, and webhook subscriptions are not yet configured.

## Required Supabase Edge Function secrets

Configure these with the Supabase Edge Function secret manager. Never put them in Vite variables, `wrangler.jsonc`, source files, browser storage, or chat messages.

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Existing Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key used to validate the caller's JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only database access; never expose to clients |
| `META_APP_ID` | Meta Developer App ID |
| `META_APP_SECRET` | Meta Developer App Secret; OAuth code exchange and webhook HMAC |
| `META_OAUTH_REDIRECT_URI` | Exact callback URL registered in Meta |
| `META_WEBHOOK_VERIFY_TOKEN` | Random high-entropy webhook verification secret |
| `META_GRAPH_API_VERSION` | A Graph API version currently enabled for the Meta App, formatted as `vNN.N` |
| `SETTINGS_ENCRYPTION_KEY` | At least 32 characters; AES-GCM key material for provider tokens |
| `APP_ORIGIN` | Exact Kosmoevretis app origin, e.g. the approved Preview or Production origin |

The callback URL must be:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/meta-api?action=oauth_callback
```

The webhook URL must be:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/meta-api/webhook
```

Register the callback URL exactly in the Meta App. Configure the webhook Verify Token to match `META_WEBHOOK_VERIFY_TOKEN`.

## Deployment order

1. [Completed] Apply the CRM foundation migration, followed by the Meta channel integration migration.
2. [Completed] Deploy the `meta-api` Supabase Edge Function (version 1, `verify_jwt=false`; the function performs its own user/org authorization and validates Meta webhook signatures).
3. Configure the secrets above using the Supabase Dashboard's Edge Function Secrets page. The current ChatGPT Supabase connection does not expose a secret-management action, so no Meta secret has been written by this deployment.
4. Register the callback and webhook URLs in the Meta Developer App; enable the Page and WhatsApp webhook fields required by the connected products.
5. Complete Meta Business Verification and request App Review / Advanced Access for the permissions required by the actual use case.
6. Test with a development Business Portfolio, test Page, and WhatsApp test number before connecting production assets.

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
