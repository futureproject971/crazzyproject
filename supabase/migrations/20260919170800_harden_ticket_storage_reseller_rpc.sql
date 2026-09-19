-- CRAZZY PROJECT - endurecimento de ticket messages, storage e RPC sensível
-- Idempotente para bases existentes.

begin;

-- Usuário comum só pode enviar mensagem como ele mesmo e nunca fingir ser staff.
drop policy if exists "Users can insert messages on own tickets" on public.ticket_messages;

create policy "Users can insert messages on own tickets"
on public.ticket_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_role = 'user'
  and exists (
    select 1
    from public.order_tickets
    where id = ticket_id
      and user_id = auth.uid()
  )
);

-- Upload/alteração/remoção de imagens somente para admin.
drop policy if exists "Authenticated can upload game images" on storage.objects;
drop policy if exists "Authenticated can update game images" on storage.objects;
drop policy if exists "Authenticated can delete game images" on storage.objects;
drop policy if exists "Admins can upload game images" on storage.objects;
drop policy if exists "Admins can update game images" on storage.objects;
drop policy if exists "Admins can delete game images" on storage.objects;

create policy "Admins can upload game images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'game-images'
  and public.has_role(auth.uid(), 'admin')
);

create policy "Admins can update game images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'game-images'
  and public.has_role(auth.uid(), 'admin')
)
with check (
  bucket_id = 'game-images'
  and public.has_role(auth.uid(), 'admin')
);

create policy "Admins can delete game images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'game-images'
  and public.has_role(auth.uid(), 'admin')
);

-- RPC de contagem do revendedor não deve ser chamável por cliente.
revoke all on function public.increment_reseller_purchases(uuid) from public;
revoke execute on function public.increment_reseller_purchases(uuid) from anon, authenticated;
grant execute on function public.increment_reseller_purchases(uuid) to service_role;

commit;
