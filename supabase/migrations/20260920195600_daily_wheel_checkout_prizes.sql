-- CRAZZY PROJECT - roleta diaria de cupons validada no servidor.
-- Um giro por conta/dia (America/Sao_Paulo). O premio vira um cupom normal,
-- restrito ao usuario e consumido apenas apos pagamento confirmado.

begin;

create table if not exists public.wheel_prizes (
  id text primary key,
  label text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric not null check (discount_value > 0),
  sort_order integer not null unique
);

insert into public.wheel_prizes (id,label,discount_type,discount_value,sort_order)
values
  ('percent5','5% OFF','percentage',5,0),
  ('percent10','10% OFF','percentage',10,1),
  ('fixed5','R$ 5','fixed',5,2),
  ('percent15','15% OFF','percentage',15,3),
  ('percent20','20% OFF','percentage',20,4),
  ('fixed10','R$ 10','fixed',10,5),
  ('fixed20','R$ 20','fixed',20,6)
on conflict (id) do update
set label=excluded.label,
    discount_type=excluded.discount_type,
    discount_value=excluded.discount_value,
    sort_order=excluded.sort_order;

create table if not exists public.wheel_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spin_date date not null,
  prize_id text not null references public.wheel_prizes(id),
  coupon_id uuid not null unique references public.coupons(id),
  payment_id uuid null,
  created_at timestamptz not null default now(),
  unique (user_id, spin_date)
);

alter table public.wheel_spins add column if not exists payment_id uuid null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.wheel_spins'::regclass
      and conname='wheel_spins_payment_id_fkey'
  ) then
    alter table public.wheel_spins
      add constraint wheel_spins_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete set null;
  end if;
end $$;

alter table public.wheel_prizes enable row level security;
alter table public.wheel_spins enable row level security;

drop policy if exists "Public wheel catalogue" on public.wheel_prizes;
create policy "Public wheel catalogue"
on public.wheel_prizes for select to anon, authenticated
using (true);

drop policy if exists "Own wheel spins" on public.wheel_spins;
create policy "Own wheel spins"
on public.wheel_spins for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.wheel_prizes from anon, authenticated;
grant select on table public.wheel_prizes to anon, authenticated;
grant all on table public.wheel_prizes to service_role;

revoke all on table public.wheel_spins from anon, authenticated;
grant select on table public.wheel_spins to authenticated;
grant all on table public.wheel_spins to service_role;

create or replace function public.claim_daily_wheel(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.wheel_spins;
  p public.wheel_prizes;
  c public.coupons;
  d date := (now() at time zone 'America/Sao_Paulo')::date;
  next_at timestamptz := ((d + 1)::timestamp at time zone 'America/Sao_Paulo');
begin
  if p_user_id is null then raise exception 'User required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 617));

  select * into s
  from public.wheel_spins
  where user_id=p_user_id and spin_date=d;

  if not found then
    select * into p
    from public.wheel_prizes
    order by random()
    limit 1;

    if p.id is null then raise exception 'No wheel prizes configured'; end if;

    insert into public.coupons (
      code, discount_type, discount_value, max_uses, min_order_value, active
    )
    values (
      'CP' || upper(replace(gen_random_uuid()::text,'-',''))::varchar(26),
      p.discount_type,
      p.discount_value,
      1,
      case when p.discount_type='fixed' then p.discount_value + 1 else 1 end,
      true
    )
    returning * into c;

    insert into public.coupon_users (coupon_id,user_id)
    values (c.id,p_user_id);

    insert into public.wheel_spins (user_id,spin_date,prize_id,coupon_id)
    values (p_user_id,d,p.id,c.id)
    returning * into s;
  else
    select * into p from public.wheel_prizes where id=s.prize_id;
    select * into c from public.coupons where id=s.coupon_id;
  end if;

  return jsonb_build_object(
    'id',s.id,
    'prize_id',p.id,
    'label',p.label,
    'sort_order',p.sort_order,
    'discount_type',p.discount_type,
    'discount_value',p.discount_value,
    'coupon_id',c.id,
    'code',c.code,
    'min_order_value',c.min_order_value,
    'spin_date',s.spin_date,
    'next_spin_at',next_at
  );
end;
$$;

revoke all on function public.claim_daily_wheel(uuid) from public, anon, authenticated;
grant execute on function public.claim_daily_wheel(uuid) to service_role;

-- Coupon codes are sensitive once personalized prizes exist. Customers validate
-- a code through coupon-validate; browser roles no longer enumerate coupons.
drop policy if exists "Anyone can view coupons" on public.coupons;
drop policy if exists "Admins can view coupons" on public.coupons;
create policy "Admins can view coupons"
on public.coupons for select to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Anyone can view coupon users" on public.coupon_users;
drop policy if exists "Admins can view coupon users" on public.coupon_users;
create policy "Admins can view coupon users"
on public.coupon_users for select to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Anyone can view coupon products" on public.coupon_products;
drop policy if exists "Admins can view coupon products" on public.coupon_products;
create policy "Admins can view coupon products"
on public.coupon_products for select to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

revoke select on table public.coupons from anon;
revoke select on table public.coupon_users from anon;
revoke select on table public.coupon_products from anon;
grant select on table public.coupons to authenticated;
grant select on table public.coupon_users to authenticated;
grant select on table public.coupon_products to authenticated;

commit;
