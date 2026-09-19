-- CRAZZY PROJECT - pedidos/tickets de compra só são criados pelo backend oficial.
-- Cliente lê os próprios pedidos e conversa via ticket_messages; Admin gerencia status.

begin;

drop policy if exists "Users can view own tickets" on public.order_tickets;
drop policy if exists "Users can insert own tickets" on public.order_tickets;
drop policy if exists "Users can update own tickets" on public.order_tickets;
drop policy if exists "Admins can manage all tickets" on public.order_tickets;

create policy "Users can view own tickets"
on public.order_tickets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage all tickets"
on public.order_tickets
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;
