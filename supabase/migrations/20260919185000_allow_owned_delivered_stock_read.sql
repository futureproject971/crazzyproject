-- CRAZZY PROJECT - cliente pode ler somente o estoque efetivamente ligado a um pedido próprio.

begin;

drop policy if exists "Users can view delivered own stock" on public.stock_items;

create policy "Users can view delivered own stock"
on public.stock_items
for select
to authenticated
using (
  exists (
    select 1
    from public.order_tickets ot
    where ot.stock_item_id = stock_items.id
      and ot.user_id = auth.uid()
  )
);

commit;
