-- CRAZZY PROJECT - checkout/delivery hardening
-- Adds idempotent paid delivery, payment timestamps, coupon ledger uniqueness,
-- and existing-database security rules mirrored by the fresh bootstrap.

begin;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.payments
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists update_payments_updated_at on public.payments;
create trigger update_payments_updated_at
before update on public.payments
for each row execute function public.update_updated_at_column();

-- Recover leases left behind by interrupted workers before enabling the new idempotent flow.
update public.payments
set status = 'ACTIVE',
    updated_at = now()
where status = 'FULFILLING'
  and updated_at < now() - interval '5 minutes';

alter table public.order_tickets
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists payment_item_index integer,
  add column if not exists payment_unit_index integer;

create unique index if not exists order_tickets_payment_unit_unique
  on public.order_tickets (payment_id, payment_item_index, payment_unit_index)
  where payment_id is not null;

create index if not exists stock_items_available_plan_idx
  on public.stock_items (product_plan_id, used, created_at);

-- The business rule already rejects a coupon after one successful use by the same user.
-- Clean accidental legacy duplicates before enforcing that invariant at database level.
delete from public.coupon_usage a
using public.coupon_usage b
where a.coupon_id = b.coupon_id
  and a.user_id = b.user_id
  and (
    a.created_at > b.created_at
    or (a.created_at = b.created_at and a.id::text > b.id::text)
  );

create unique index if not exists coupon_usage_coupon_user_unique
  on public.coupon_usage (coupon_id, user_id);

create or replace function public.claim_paid_delivery(
  p_payment_id uuid,
  p_user_id uuid,
  p_product_id uuid,
  p_product_plan_id uuid,
  p_item_index integer,
  p_unit_index integer
)
returns table(ticket_id uuid, stock_item_id uuid, created boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ticket_id uuid;
  v_stock_id uuid;
begin
  if p_item_index < 0 or p_unit_index < 0 then
    raise exception 'Invalid delivery unit index';
  end if;

  if not exists (
    select 1
    from public.payments p
    where p.id = p_payment_id
      and p.user_id = p_user_id
      and p.status in ('FULFILLING', 'COMPLETED')
  ) then
    raise exception 'Payment is not eligible for delivery';
  end if;

  select ot.id, ot.stock_item_id
  into v_ticket_id, v_stock_id
  from public.order_tickets ot
  where ot.payment_id = p_payment_id
    and ot.payment_item_index = p_item_index
    and ot.payment_unit_index = p_unit_index
  limit 1;

  if found then
    return query select v_ticket_id, v_stock_id, false;
    return;
  end if;

  if not exists (
    select 1
    from public.product_plans pp
    join public.products pr on pr.id = pp.product_id
    where pp.id = p_product_plan_id
      and pp.product_id = p_product_id
      and pp.active = true
      and pr.active = true
  ) then
    raise exception 'Product or plan is not active';
  end if;

  begin
    select si.id
    into v_stock_id
    from public.stock_items si
    where si.product_plan_id = p_product_plan_id
      and si.used = false
    order by si.created_at, si.id
    for update skip locked
    limit 1;

    if v_stock_id is not null then
      update public.stock_items
      set used = true,
          used_at = now()
      where id = v_stock_id
        and used = false;
    end if;

    insert into public.order_tickets (
      user_id,
      product_id,
      product_plan_id,
      stock_item_id,
      status,
      status_label,
      metadata,
      payment_id,
      payment_item_index,
      payment_unit_index
    )
    values (
      p_user_id,
      p_product_id,
      p_product_plan_id,
      v_stock_id,
      case when v_stock_id is null then 'open' else 'delivered' end,
      case when v_stock_id is null then 'Aguardando Entrega' else 'Entregue' end,
      jsonb_build_object(
        'payment_id', p_payment_id,
        'payment_item_index', p_item_index,
        'payment_unit_index', p_unit_index
      ),
      p_payment_id,
      p_item_index,
      p_unit_index
    )
    returning id into v_ticket_id;
  exception when unique_violation then
    select ot.id, ot.stock_item_id
    into v_ticket_id, v_stock_id
    from public.order_tickets ot
    where ot.payment_id = p_payment_id
      and ot.payment_item_index = p_item_index
      and ot.payment_unit_index = p_unit_index
    limit 1;

    if v_ticket_id is null then
      raise;
    end if;

    return query select v_ticket_id, v_stock_id, false;
    return;
  end;

  return query select v_ticket_id, v_stock_id, true;
end;
$$;

revoke all on function public.claim_paid_delivery(uuid, uuid, uuid, uuid, integer, integer) from public;
revoke execute on function public.claim_paid_delivery(uuid, uuid, uuid, uuid, integer, integer) from anon, authenticated;
grant execute on function public.claim_paid_delivery(uuid, uuid, uuid, uuid, integer, integer) to service_role;

-- Customers may only send messages as themselves and never forge staff/system messages.
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

-- Storage mutation is an admin operation. Public reads remain controlled separately.
drop policy if exists "Authenticated can upload game images" on storage.objects;
drop policy if exists "Authenticated can update game images" on storage.objects;
drop policy if exists "Authenticated can delete game images" on storage.objects;
drop policy if exists "Admins can upload game images" on storage.objects;
drop policy if exists "Admins can update game images" on storage.objects;
drop policy if exists "Admins can delete game images" on storage.objects;

create policy "Admins can upload game images" on storage.objects
for insert to authenticated
with check (bucket_id = 'game-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update game images" on storage.objects
for update to authenticated
using (bucket_id = 'game-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'game-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete game images" on storage.objects
for delete to authenticated
using (bucket_id = 'game-images' and public.has_role(auth.uid(), 'admin'));

create or replace function public.increment_reseller_purchases(_reseller_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.resellers
  set total_purchases = total_purchases + 1
  where id = _reseller_id;
$$;

revoke all on function public.increment_reseller_purchases(uuid) from public;
revoke execute on function public.increment_reseller_purchases(uuid) from anon, authenticated;
grant execute on function public.increment_reseller_purchases(uuid) to service_role;

commit;
