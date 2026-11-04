# Kosmoevretis pre-authentication checkpoint

- Date: 2026-11-05
- Repository branch: `3c-platform`
- Pre-change commit: `55b22e7522c1cc2438b82c882b861fc916a45e4a`
- Supabase project: `npkesfmszokmlgnzqelb` (Postgres 17.11)
- Cloudflare Pages: `kosmoevretis-platform`
- Production baseline deployment: `7833404c-8c45-4865-a733-2ce4def40d27`

## Read-only baseline

- 29 public tables observed; all have RLS enabled.
- 84 public RLS policies observed; all target `authenticated`, no `anon` policies observed.
- 23 applied database migrations recorded in Supabase migration history.
- Two existing Auth users are retained. The sole organization `owner` is the selected platform-admin candidate; user identifiers and emails are intentionally omitted from this public repository note.
- Five active Edge Functions observed: `settings-api`, `market-trends`, `facebook-discovery`, `linkedin-discovery`, `google-maps-discovery`; all have JWT verification enabled.

## Existing migration history

| Version | Name |
|---|---|
| 20261103082638 | production_foundation |
| 20261103083057 | harden_rls_and_audit_v2 |
| 20261103083138 | profile_versioning |
| 20261103113341 | market_trend_tasks |
| 20261103113557 | market_trend_tasks_created_by_index |
| 20261103113806 | market_trend_key_value_outputs |
| 20261104000909 | unified_research_task_foundation |
| 20261104000937 | fix_research_execution_rls_and_grants |
| 20261104001018 | backfill_existing_research_task_executions |
| 20261104020745 | product_catalog_foundation |
| 20261104021118 | product_catalog_tenant_integrity |
| 20261104021304 | product_catalog_fk_indexes |
| 20261104021503 | product_catalog_remove_duplicate_fks |
| 20261104021551 | product_attribute_normalized_units |
| 20261104030040 | product_attribute_library_and_intelligence_modes |
| 20261104030257 | product_attribute_library_fk_indexes_and_audit |
| 20261104033955 | global_intelligence_catalog |
| 20261104043641 | product_center_odoo_catalog_rebuild |
| 20261104044029 | product_center_foreign_key_indexes |
| 20261104053854 | settings_backend_foundation |
| 20261104124254 | facebook_discovery_task_type |
| 20261104132058 | linkedin_discovery_task_type |
| 20261104133635 | add_google_maps_discovery_task_type |

## Recovery guardrails

1. Do not delete or ban either existing Auth user.
2. Do not disable public sign-up or change production RLS before the selected owner has successfully signed in and enrolled TOTP MFA.
3. Do not rotate or remove existing API credentials during this rollout.
4. Do not deploy mandatory-auth production code until API and database guards are deployed and tested.
5. Confirm an actual restorable database backup or create/download a logical dump before the first production DDL/policy change.
6. No Apify actors are to be run during authentication work.

This is a source and security-inventory checkpoint, not a full physical database backup. Supabase plan and the latest restorable backup point must be verified in the Dashboard; Supabase documents daily backups for Pro, Team and Enterprise projects.
