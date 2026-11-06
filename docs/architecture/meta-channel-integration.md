# Meta Channel Integration Architecture

Status: implementation contract for the next delivery slice. This document does not mean Meta credentials, OAuth, webhooks, or message delivery are configured.

## 1. Scope and channel model

Keep all channels inside the existing Kosmoevretis organization workspace. Do not create a separate CRM or Supabase project.

| Channel | Supported connection model | Initial capability |
|---|---|---|
| WhatsApp Business | Meta OAuth / Embedded Signup, WhatsApp Business Account and Phone Number ID | Inbound and approved outbound business messages |
| Messenger | Meta OAuth, Facebook Page authorization | Page-scoped customer conversations |
| Facebook Page | Meta OAuth and Page permissions | Page content/interaction discovery; not personal inbox access |
| Email | Existing Kosmoevretis mail account and mail API | Existing mailbox account discovery; message sync/send remains separately gated |

No connector may read arbitrary personal accounts, private groups, or data outside the authorized business assets.

## 2. OAuth and credential lifecycle

1. A signed-in organization administrator starts the connection from the channel settings page.
2. The backend creates a cryptographically random, single-use OAuth state bound to organization ID, user ID, provider, and a short expiry.
3. Redirect to Meta authorization with the minimum permissions needed for the selected channel.
4. The callback validates state, exchanges the authorization code server-side, discovers the authorized Page / WABA assets, and asks the administrator to select which assets to connect.
5. Access tokens are encrypted at rest using the existing server-side encryption pattern (SETTINGS_ENCRYPTION_KEY, AES-GCM, random 96-bit IV). Only non-secret connection metadata is exposed to authenticated clients.
6. Record scopes, asset IDs, token expiry, last validation time, and connection status. Never log access tokens, app secrets, authorization codes, or raw Authorization headers.
7. Support disconnect and token rotation/re-authorization; revoke remote permissions when the provider supports it.

Meta App ID and App Secret are server environment secrets. Per-organization Page and WhatsApp tokens are encrypted in a private schema table. No secret belongs in Vite environment variables or browser storage.

## 3. Webhook contract

The public webhook endpoint is separate from authenticated channel-management APIs.

### Verification request

- Accept only GET verification requests.
- Require hub.mode=subscribe.
- Compare hub.verify_token against the server secret using a constant-time comparison.
- Return the exact hub.challenge only after successful verification.

### Event delivery

- Read the raw request body before parsing JSON.
- Validate X-Hub-Signature-256 as sha256=<hex> using HMAC-SHA256 with the Meta App Secret.
- Reject missing or invalid signatures with 401.
- Resolve each event's Page ID / Phone Number ID to an active organization connection.
- Persist the event with a provider event ID / payload hash idempotency key before returning 200.
- Process asynchronously after durable acceptance. Retry transient failures; quarantine malformed or unsupported events.
- Redact credentials and sensitive message content from operational logs.

Webhook delivery is not a user session and must not be protected by Supabase JWT verification. The webhook itself must authenticate using Meta's signature. User-facing management and send operations must validate Supabase user sessions and organization membership.

## 4. Data model contract

The following schema is a proposed migration contract; it has not been applied to the shared database.

- crm_channel_connections: organization, provider, external business asset ID, display name, status, scopes, token expiry, metadata, audit fields. Unique by organization + provider + external asset ID.
- private.crm_channel_credentials: connection ID, encrypted access token, IV, credential version, update timestamp. No authenticated or anon grants.
- crm_conversations: organization, connection, channel, external conversation ID, optional company/contact/lead references, participant summary, status, last message time. Unique by connection + external conversation ID.
- crm_messages: organization, conversation, channel, provider message ID, direction, sender, text/body, attachment metadata, delivery state, sent/received timestamps. Unique by connection + provider message ID where provider ID exists.
- crm_message_drafts: organization, conversation, author, body, language, AI provenance, approval state, approver, approval timestamp, send attempt and result metadata.
- crm_channel_webhook_events: private durable inbox for raw provider event payloads, dedupe key, processing state, retry count, received/processed timestamps, and redacted error metadata.

Every organization-facing table must use organization-scoped RLS. Composite foreign keys must prevent cross-organization references. Authenticated users may read only organizations they belong to. Credential and raw webhook tables are service-role only in the private schema. Clients cannot set a message to sent or bypass the approval workflow.

## 5. Human approval and send state machine

draft -> pending_approval -> approved -> sending -> sent

Failure and cancellation branches:

- pending_approval -> rejected
- approved -> cancelled
- sending -> failed -> approved (retry requires an explicit new send attempt)

A sender must re-check organization membership, connection status, recipient eligibility, opt-in evidence, provider policy window, and approval state immediately before the API call. The provider response ID and delivery status are written to an immutable audit trail.

AI may classify, summarize, extract requirements, translate, and draft. AI must not autonomously send messages, initiate bulk outreach, or commit to price, discount, stock, shipping, or delivery dates.

## 6. Channel policy constraints

- WhatsApp: use the official WhatsApp Business Platform; retain evidence of opt-in; use approved templates for business-initiated messages outside the customer service window; respect quality and messaging limits.
- Messenger: only Page-authorized conversations and approved permissions; enforce Meta messaging windows and allowed use cases.
- Facebook Page: only authorized Page assets and granted permissions; do not infer access to private user content.
- App Review / Business Verification: request only permissions required for the product's actual features and complete Meta review where required.

## 7. Operational acceptance criteria

- OAuth state is single-use, short-lived, and organization-bound.
- Webhook HMAC verification has positive and negative tests.
- Duplicate webhook events do not create duplicate messages.
- Invalid signatures never reach message processing.
- Tokens and app secrets never appear in client responses or logs.
- RLS tests prove that a user in organization A cannot read organization B's channels, conversations, messages, drafts, or activities.
- Outbound tests prove that no send occurs before explicit approval and policy checks.
- Preview validation includes typecheck, design-system check, production build, and a manual check of the inbox routes.
