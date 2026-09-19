-- CRAZZY PROJECT - security hardening for fresh/live databases.
-- Moves the role helper out of the exposed public schema, scopes admin policies,
-- closes trigger helpers as RPC endpoints, and removes a duplicate coupon index.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.has_role(uuid, public.app_role) set schema private;

revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ilike '%has_role%'
        or coalesce(with_check, '') ilike '%has_role%'
      )
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  end loop;
end
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;

drop index if exists public.coupon_usage_coupon_user_unique;

commit;
