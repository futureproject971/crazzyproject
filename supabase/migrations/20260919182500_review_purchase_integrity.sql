-- CRAZZY PROJECT - avaliações somente de compradores reais e uma por produto/usuário

begin;

-- Mantém apenas a avaliação mais recente se houver duplicatas legadas.
delete from public.product_reviews older
using public.product_reviews newer
where older.user_id = newer.user_id
  and older.product_id = newer.product_id
  and (
    older.created_at < newer.created_at
    or (older.created_at = newer.created_at and older.id::text < newer.id::text)
  );

create unique index if not exists product_reviews_user_product_unique
  on public.product_reviews(user_id, product_id);

drop policy if exists "Users can insert own reviews" on public.product_reviews;
drop policy if exists "Users can update own reviews" on public.product_reviews;
drop policy if exists "Users can delete own reviews" on public.product_reviews;
drop policy if exists "Admins can manage reviews" on public.product_reviews;

create policy "Users can insert purchased product reviews"
on public.product_reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
  and rating between 1 and 5
  and exists (
    select 1
    from public.order_tickets ot
    where ot.user_id = auth.uid()
      and ot.product_id = product_reviews.product_id
      and ot.status in ('delivered', 'resolved', 'closed', 'finished')
  )
);

create policy "Users can update purchased product reviews"
on public.product_reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and rating between 1 and 5
  and exists (
    select 1
    from public.order_tickets ot
    where ot.user_id = auth.uid()
      and ot.product_id = product_reviews.product_id
      and ot.status in ('delivered', 'resolved', 'closed', 'finished')
  )
);

create policy "Users can delete own reviews"
on public.product_reviews
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can manage reviews"
on public.product_reviews
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;
