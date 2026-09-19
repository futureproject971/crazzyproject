-- CRAZZY PROJECT - pagamentos só podem ser criados pelo backend oficial.
-- O checkout PurinCash usa service_role; o navegador mantém apenas leitura dos próprios pagamentos.

begin;

drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Admins can manage all payments" on public.payments;

create policy "Users can view own payments"
on public.payments
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage all payments"
on public.payments
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;
