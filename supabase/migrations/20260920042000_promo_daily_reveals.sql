begin;

create table if not exists public.promo_daily_reveals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reveal_date date not null default (timezone('UTC', now()))::date,
  result_key text not null check (result_key in ('rewards_trial','featured_product','try_tomorrow')),
  product_id uuid null references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, reveal_date)
);

alter table public.promo_daily_reveals enable row level security;

drop policy if exists "Users read own promo reveals" on public.promo_daily_reveals;
create policy "Users read own promo reveals"
on public.promo_daily_reveals
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins manage promo reveals" on public.promo_daily_reveals;
create policy "Admins manage promo reveals"
on public.promo_daily_reveals
for all
to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

revoke all on table public.promo_daily_reveals from anon;
grant select on table public.promo_daily_reveals to authenticated;
grant all on table public.promo_daily_reveals to service_role;

create index if not exists promo_daily_reveals_user_created_idx
  on public.promo_daily_reveals (user_id, created_at desc);
create index if not exists promo_daily_reveals_product_idx
  on public.promo_daily_reveals (product_id);

commit;
