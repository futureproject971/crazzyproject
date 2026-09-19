-- CRAZZY PROJECT - ledger de uso de cupom somente pelo backend/service role.
-- O cliente continua podendo ler o próprio histórico para UX.

begin;

drop policy if exists "Users can insert own usage" on public.coupon_usage;
drop policy if exists "Users can view own coupon usage" on public.coupon_usage;
drop policy if exists "Admins can manage coupon usage" on public.coupon_usage;

create policy "Users can view own coupon usage"
on public.coupon_usage
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage coupon usage"
on public.coupon_usage
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;
