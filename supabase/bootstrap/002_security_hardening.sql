-- CRAZZY PROJECT - SECURITY HARDENING
-- Bootstrap step for a fresh CRAZZY database.

begin;


-- ============================================================
-- ADMIN ROLE HELPER: move the SECURITY DEFINER helper out of the exposed public
-- schema. Policies keep working by dependency, but the function is no longer a public
-- RPC endpoint. Admin policies are scoped to authenticated callers only.
-- ============================================================
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.has_role(uuid, public.app_role) set schema private;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select _user_id = (select auth.uid())
    and exists (
      select 1 from public.user_roles
      where user_id = _user_id and role = _role
    );
$;

revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

do $
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
$;

-- Trigger/event-trigger helpers are internal infrastructure and must not be callable
-- through the Data API.
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;

-- ============================================================
-- PAYMENTS: browser may read its own rows, but must NEVER create/modify payment facts.
-- ============================================================
alter table public.payments enable row level security;
alter table public.payments
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists "Users can create own payments" on public.payments;
drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Service can update payments" on public.payments;

-- service_role/secret-key clients bypass RLS. An UPDATE policy USING(true) is therefore
-- unnecessary and dangerous for normal authenticated users.
revoke insert, update, delete on table public.payments from anon, authenticated;
grant select on table public.payments to authenticated;

-- Provider references must identify one and only one order. Stop instead of silently
-- binding a paid gateway transaction to an attacker-created second row.
do $$
begin
  if exists (
    select charge_id
    from public.payments
    where charge_id is not null
    group by charge_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate payments.charge_id values exist. Reconcile them before adding the unique index.';
  end if;
end $$;

create unique index if not exists payments_charge_id_unique
  on public.payments(charge_id)
  where charge_id is not null;

-- ============================================================
-- ORDER TICKETS: customers can read their deliveries and send chat messages, but
-- purchase/delivery tickets are created and transitioned only by backend/admin paths.
-- ============================================================
alter table public.order_tickets enable row level security;
drop policy if exists "Users can create own tickets" on public.order_tickets;
drop policy if exists "Users can insert own tickets" on public.order_tickets;
drop policy if exists "Users can update own tickets" on public.order_tickets;

-- ============================================================
-- TICKET CHAT: customers may send messages only as themselves and only with the user
-- role. Without this check a customer could forge sender_role='staff' in their own ticket.
-- ============================================================
alter table public.ticket_messages enable row level security;
drop policy if exists "Users can insert messages on own tickets" on public.ticket_messages;
drop policy if exists "Users can send messages on own tickets" on public.ticket_messages;
create policy "Users can send messages on own tickets"
  on public.ticket_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'user'
    and exists (
      select 1 from public.order_tickets
      where order_tickets.id = ticket_messages.ticket_id
        and order_tickets.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- STOCK: remove every historical generic authenticated policy. Keep only the policy
-- that exposes a key already attached to THIS user's delivered order, plus admin policy.
-- ============================================================
alter table public.stock_items enable row level security;
drop policy if exists "Authenticated users can read available stock" on public.stock_items;
drop policy if exists "Authenticated users can claim stock" on public.stock_items;

drop policy if exists "Users can view own delivered stock" on public.stock_items;
create policy "Users can view own delivered stock"
  on public.stock_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.order_tickets
      where order_tickets.stock_item_id = stock_items.id
        and order_tickets.user_id = (select auth.uid())
        and order_tickets.status in ('delivered', 'resolved', 'closed', 'finished', 'archived')
    )
  );

-- ============================================================
-- COUPONS: coupon usage is a payment-side fact. Customer code may read whether it was
-- used, but only the backend records a successful use.
-- ============================================================
alter table public.coupon_usage enable row level security;
drop policy if exists "Users can insert own usage" on public.coupon_usage;
revoke insert, update, delete on table public.coupon_usage from anon, authenticated;
grant select on table public.coupon_usage to authenticated;

-- A user may consume a coupon at most once. This also makes webhook retries harmless
-- for the coupon ledger. Resolve any historical duplicates before applying if needed.
do $$
begin
  if exists (
    select coupon_id, user_id
    from public.coupon_usage
    group by coupon_id, user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate coupon_usage rows exist. Reconcile them before adding the unique index.';
  end if;
end $$;

-- public.coupon_usage already has UNIQUE (coupon_id, user_id) in the core schema,
-- so do not create a duplicate unique index here.
drop index if exists public.coupon_usage_coupon_user_unique;

-- ============================================================
-- PROFILES: browser cannot alter ban fields or another identity. Public/profile UI only
-- needs basic profile columns. Admin bans already go through the admin-users Edge Function.
-- ============================================================
alter table public.profiles enable row level security;

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own basic profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke insert, update, select on table public.profiles from anon, authenticated;
grant select (user_id, username, avatar_url) on table public.profiles to anon, authenticated;
grant update (username, avatar_url) on table public.profiles to authenticated;

-- Profiles are created by the auth trigger; users do not need a browser INSERT route.
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

-- ============================================================
-- RESELLER ACCOUNTING RPC: this SECURITY DEFINER helper is only used by trusted
-- fulfillment code. Browser roles must never be able to increment counters directly.
-- ============================================================
revoke all on function public.increment_reseller_purchases(uuid) from public;
revoke all on function public.increment_reseller_purchases(uuid) from anon, authenticated;
grant execute on function public.increment_reseller_purchases(uuid) to service_role;

-- ============================================================
-- SYSTEM CREDENTIALS: this legacy table must not be a secret vault. API keys move to
-- Supabase Edge Function Secrets; only the public Discord URL may retain a value here.
-- ============================================================
update public.system_credentials
set value = ''
where env_key <> 'DISCORD_INVITE_URL' and value <> '';

drop policy if exists "Public can view Discord invite" on public.system_credentials;
create policy "Public can view Discord invite"
  on public.system_credentials
  for select
  to anon, authenticated
  using (env_key = 'DISCORD_INVITE_URL');

-- ============================================================
-- STORAGE: preserve public reads for game images, remove generic authenticated writes.
-- Existing admin-only storage policies remain in force.
-- ============================================================
drop policy if exists "Authenticated can upload game images" on storage.objects;
drop policy if exists "Authenticated can update game images" on storage.objects;
drop policy if exists "Authenticated can delete game images" on storage.objects;


-- ============================================================
-- PAID DELIVERY IDEMPOTENCY: bind each paid cart unit to one ticket and claim stock
-- in the same database transaction. This prevents webhook/polling retries or partial
-- failures from delivering a second key for a unit that was already processed.
-- ============================================================
alter table public.order_tickets
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists payment_item_index integer,
  add column if not exists payment_unit_index integer;

-- Backfill payment_id when old tickets already carry it in metadata. Invalid legacy
-- values are ignored rather than aborting the migration.
update public.order_tickets
set payment_id = (metadata->>'payment_id')::uuid
where payment_id is null
  and metadata ? 'payment_id'
  and (metadata->>'payment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

do $$
begin
  if exists (
    select payment_id, payment_item_index, payment_unit_index
    from public.order_tickets
    where payment_id is not null
      and payment_item_index is not null
      and payment_unit_index is not null
    group by payment_id, payment_item_index, payment_unit_index
    having count(*) > 1
  ) then
    raise exception 'Duplicate paid-delivery ticket coordinates exist. Reconcile before enabling idempotent delivery.';
  end if;
end $$;

create unique index if not exists order_tickets_payment_unit_unique
  on public.order_tickets(payment_id, payment_item_index, payment_unit_index)
  where payment_id is not null
    and payment_item_index is not null
    and payment_unit_index is not null;

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
security definer
set search_path = public
as $$
declare
  v_ticket_id uuid;
  v_stock_id uuid;
  v_created boolean := false;
begin
  if p_payment_id is null or p_user_id is null or p_product_id is null or p_product_plan_id is null then
    raise exception 'paid delivery requires payment, user, product and plan ids';
  end if;
  if p_item_index < 0 or p_unit_index < 0 then
    raise exception 'invalid paid delivery coordinates';
  end if;

  -- Fast idempotency path for webhook/polling retries.
  select ot.id, ot.stock_item_id
    into v_ticket_id, v_stock_id
  from public.order_tickets ot
  where ot.payment_id = p_payment_id
    and ot.payment_item_index = p_item_index
    and ot.payment_unit_index = p_unit_index
  limit 1;

  if v_ticket_id is not null then
    return query select v_ticket_id, v_stock_id, false;
    return;
  end if;

  -- This nested block acts like a savepoint. If another worker wins the unique ticket
  -- race, our stock update is rolled back before we return the winner's ticket.
  begin
    select si.id
      into v_stock_id
    from public.stock_items si
    where si.product_plan_id = p_product_plan_id
      and si.used = false
    order by si.created_at asc
    for update skip locked
    limit 1;

    if v_stock_id is not null then
      update public.stock_items
      set used = true, used_at = now()
      where id = v_stock_id;
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
    ) values (
      p_user_id,
      p_product_id,
      p_product_plan_id,
      v_stock_id,
      case when v_stock_id is null then 'open'::public.ticket_status else 'delivered'::public.ticket_status end,
      case when v_stock_id is null then 'Aberto' else 'Entregue' end,
      jsonb_build_object('payment_id', p_payment_id),
      p_payment_id,
      p_item_index,
      p_unit_index
    )
    returning id into v_ticket_id;

    v_created := true;
  exception when unique_violation then
    v_ticket_id := null;
    v_stock_id := null;
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
  end;

  return query select v_ticket_id, v_stock_id, v_created;
end;
$$;

-- The function bypasses RLS by design but is server-only. Never expose EXECUTE to
-- browser roles; Edge Functions call it with the service-role/secret client.
revoke all on function public.claim_paid_delivery(uuid, uuid, uuid, uuid, integer, integer) from public;
revoke all on function public.claim_paid_delivery(uuid, uuid, uuid, uuid, integer, integer) from anon, authenticated;
grant execute on function public.claim_paid_delivery(uuid, uuid, uuid, uuid, integer, integer) to service_role;

commit;
