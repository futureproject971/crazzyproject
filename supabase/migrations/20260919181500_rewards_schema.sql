-- CRAZZY PROJECT - schema completo do Rewards / trials
-- Mantém estoque de trial separado do estoque pago e dá suporte ao frontend,
-- fila admin e Edge Function rewards já versionados.

begin;

create table if not exists public.reward_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_url text not null,
  video_provider text not null default 'youtube',
  required_watch_seconds integer not null default 60 check (required_watch_seconds > 0),
  cooldown_hours integer not null default 24 check (cooldown_hours >= 0),
  requirements jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_campaign_products (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.reward_campaigns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_plan_id uuid references public.product_plans(id) on delete set null,
  trial_duration_minutes integer not null default 60 check (trial_duration_minutes > 0),
  delivery_mode text not null default 'manual' check (delivery_mode in ('manual','automatic')),
  auto_delay_seconds integer not null default 0 check (auto_delay_seconds >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trial_stock_items (
  id uuid primary key default gen_random_uuid(),
  product_plan_id uuid not null references public.product_plans(id) on delete cascade,
  content text not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  used boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.reward_campaigns(id) on delete cascade,
  campaign_product_id uuid not null references public.reward_campaign_products(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_plan_id uuid references public.product_plans(id) on delete set null,
  status text not null default 'watching',
  watched_seconds numeric not null default 0 check (watched_seconds >= 0),
  last_video_position numeric,
  last_heartbeat_at timestamptz,
  heartbeat_count integer not null default 0,
  visibility_failures integer not null default 0,
  completed_at timestamptz,
  requested_at timestamptz,
  eligible_delivery_at timestamptz,
  delivered_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_deliveries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reward_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  trial_stock_item_id uuid references public.trial_stock_items(id) on delete set null,
  content text not null,
  delivery_mode text not null default 'manual' check (delivery_mode in ('manual','automatic')),
  delivered_by uuid references auth.users(id) on delete set null,
  delivered_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reward_campaigns_active_sort_idx
  on public.reward_campaigns(active, sort_order);
create index if not exists reward_campaign_products_campaign_active_sort_idx
  on public.reward_campaign_products(campaign_id, active, sort_order);
create index if not exists trial_stock_available_idx
  on public.trial_stock_items(product_plan_id, used, created_at);
create index if not exists reward_sessions_user_campaign_created_idx
  on public.reward_sessions(user_id, campaign_id, created_at desc);
create index if not exists reward_sessions_status_created_idx
  on public.reward_sessions(status, created_at);
create index if not exists reward_deliveries_user_idx
  on public.reward_deliveries(user_id, delivered_at desc);

drop trigger if exists update_reward_campaigns_updated_at on public.reward_campaigns;
create trigger update_reward_campaigns_updated_at
before update on public.reward_campaigns
for each row execute function public.update_updated_at_column();

drop trigger if exists update_reward_campaign_products_updated_at on public.reward_campaign_products;
create trigger update_reward_campaign_products_updated_at
before update on public.reward_campaign_products
for each row execute function public.update_updated_at_column();

drop trigger if exists update_reward_sessions_updated_at on public.reward_sessions;
create trigger update_reward_sessions_updated_at
before update on public.reward_sessions
for each row execute function public.update_updated_at_column();

alter table public.reward_campaigns enable row level security;
alter table public.reward_campaign_products enable row level security;
alter table public.trial_stock_items enable row level security;
alter table public.reward_sessions enable row level security;
alter table public.reward_deliveries enable row level security;

drop policy if exists "Admins manage reward campaigns" on public.reward_campaigns;
create policy "Admins manage reward campaigns"
on public.reward_campaigns for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage reward campaign products" on public.reward_campaign_products;
create policy "Admins manage reward campaign products"
on public.reward_campaign_products for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage trial stock" on public.trial_stock_items;
create policy "Admins manage trial stock"
on public.trial_stock_items for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users view own reward sessions" on public.reward_sessions;
create policy "Users view own reward sessions"
on public.reward_sessions for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins manage reward sessions" on public.reward_sessions;
create policy "Admins manage reward sessions"
on public.reward_sessions for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users view own reward deliveries" on public.reward_deliveries;
create policy "Users view own reward deliveries"
on public.reward_deliveries for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins manage reward deliveries" on public.reward_deliveries;
create policy "Admins manage reward deliveries"
on public.reward_deliveries for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

commit;
