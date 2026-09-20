-- CRAZZY PROJECT - consolidate promo reveal SELECT policy for lower RLS overhead.
begin;

drop policy if exists "Admins manage promo reveals" on public.promo_daily_reveals;
drop policy if exists "Users read own promo reveals" on public.promo_daily_reveals;

create policy "Promo reveals visible to owner or admin"
on public.promo_daily_reveals
for select to authenticated
using (
  (select auth.uid()) = user_id
  or private.has_role((select auth.uid()), 'admin'::public.app_role)
);

create policy "Admins insert promo reveals"
on public.promo_daily_reveals
for insert to authenticated
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Admins update promo reveals"
on public.promo_daily_reveals
for update to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

create policy "Admins delete promo reveals"
on public.promo_daily_reveals
for delete to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

commit;
