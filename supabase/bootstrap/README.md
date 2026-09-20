# CRAZZY PROJECT fresh Supabase bootstrap

These scripts are for a **brand-new empty Supabase project**. They intentionally do not
replay the historical migration folder, because that history contains duplicate schema
creation, old gateway fields, old user IDs, and data repair statements from the previous
store.

Apply in order:

1. `001_core_schema.sql` — current core store/admin/ticket schema.
2. `002_security_hardening.sql` — locks payments, stock, admin helpers and paid delivery.
3. `003_rewards.sql` — CRAZZY Rewards / one-hour trial subsystem.
4. `004_access_grants.sql` — explicit Data API grants for a fresh project.
5. `005_performance_indexes.sql` — indexes foreign keys used by joins, tickets, checkout, catalog and Rewards.
6. `006_rls_policy_consolidation.sql` — removes duplicate permissive policies and keeps delivered-stock reads strict.

After applying, create the first admin through Supabase Auth, add its UUID to
`public.user_roles` with role `admin`, set Edge Function secrets, deploy functions, then
run Supabase security/performance advisors before enabling production checkout.

Do not put PurinCash, service-role, webhook, provider, or signing secrets in the frontend.
