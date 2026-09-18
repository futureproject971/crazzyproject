-- CRAZZY PROJECT - REWARDS / TRIAL SYSTEM
-- Bootstrap step for a fresh CRAZZY database.

begin;

-- Campaign = mission presented to the user (for example: watch a YouTube video).
create table if not exists public.reward_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_url text not null,
  video_provider text not null default 'youtube' check (video_provider in ('youtube')),
  required_watch_seconds integer not null default 60 check (required_watch_seconds between 15 and 3600),
  cooldown_hours integer not null default 168 check (cooldown_hours between 0 and 8760),
  requirements jsonb not null default '{"watch":true}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products/plans that may be selected for a campaign. Delivery mode lives here because
-- one product can be automatic while another needs staff review.
create table if not exists public.reward_campaign_products (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.reward_campaigns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_plan_id uuid references public.product_plans(id) on delete cascade,
  trial_duration_minutes integer not null default 60 check (trial_duration_minutes between 15 and 1440),
  delivery_mode text not null default 'manual' check (delivery_mode in ('manual', 'automatic')),
  auto_delay_seconds integer not null default 300 check (auto_delay_seconds between 0 and 86400),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists reward_campaign_products_unique
  on public.reward_campaign_products(campaign_id, product_id, coalesce(product_plan_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Separate inventory so a one-hour trial can never consume a paid monthly/lifetime key.
create table if not exists public.trial_stock_items (
  id uuid primary key default gen_random_uuid(),
  product_plan_id uuid not null references public.product_plans(id) on delete cascade,
  content text not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 1440),
  used boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trial_stock_available_idx
  on public.trial_stock_items(product_plan_id, used, created_at);

-- Server-owned mission state. Browser may read its own session but never write progress.
create table if not exists public.reward_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.reward_campaigns(id) on delete cascade,
  campaign_product_id uuid not null references public.reward_campaign_products(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_plan_id uuid references public.product_plans(id) on delete restrict,
  status text not null default 'watching' check (status in (
    'watching', 'completed', 'requested', 'delivering', 'delivered', 'rejected', 'expired'
  )),
  watched_seconds numeric(10,3) not null default 0,
  last_video_position numeric(10,3),
  last_heartbeat_at timestamptz,
  heartbeat_count integer not null default 0,
  visibility_failures integer not null default 0,
  requirements_completed jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  requested_at timestamptz,
  eligible_delivery_at timestamptz,
  delivered_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reward_sessions_user_campaign_idx
  on public.reward_sessions(user_id, campaign_id, created_at desc);

-- Prevent two concurrent browser requests from opening two active missions for the
-- same campaign. Application checks improve UX; this constraint is the real lock.
create unique index if not exists reward_sessions_one_active_campaign
  on public.reward_sessions(user_id, campaign_id)
  where status in ('watching', 'completed', 'requested', 'delivering');
create index if not exists reward_sessions_delivery_queue_idx
  on public.reward_sessions(status, eligible_delivery_at)
  where status in ('requested', 'delivering');

-- Delivered trial content lives behind user ownership RLS and is never exposed in campaign APIs.
create table if not exists public.reward_deliveries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reward_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  trial_stock_item_id uuid references public.trial_stock_items(id) on delete set null,
  content text,
  delivery_mode text not null check (delivery_mode in ('manual', 'automatic')),
  delivered_by uuid references auth.users(id) on delete set null,
  delivered_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reward_campaigns enable row level security;
alter table public.reward_campaign_products enable row level security;
alter table public.trial_stock_items enable row level security;
alter table public.reward_sessions enable row level security;
alter table public.reward_deliveries enable row level security;

-- Campaign catalog is safe to show. Sensitive inventory/content is not.
drop policy if exists "Public can view active reward campaigns" on public.reward_campaigns;
create policy "Public can view active reward campaigns"
  on public.reward_campaigns for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Public can view active reward products" on public.reward_campaign_products;
create policy "Public can view active reward products"
  on public.reward_campaign_products for select
  to anon, authenticated
  using (active = true and exists (
    select 1 from public.reward_campaigns c where c.id = campaign_id and c.active = true
  ));

-- Users can only read their own mission state and delivered content.
drop policy if exists "Users can view own reward sessions" on public.reward_sessions;
create policy "Users can view own reward sessions"
  on public.reward_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own reward deliveries" on public.reward_deliveries;
create policy "Users can view own reward deliveries"
  on public.reward_deliveries for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Admin policies. Normal browser users receive no INSERT/UPDATE/DELETE policy for server-owned state.
drop policy if exists "Admins manage reward campaigns" on public.reward_campaigns;
create policy "Admins manage reward campaigns" on public.reward_campaigns for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward products" on public.reward_campaign_products;
create policy "Admins manage reward products" on public.reward_campaign_products for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage trial stock" on public.trial_stock_items;
create policy "Admins manage trial stock" on public.trial_stock_items for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward sessions" on public.reward_sessions;
create policy "Admins manage reward sessions" on public.reward_sessions for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward deliveries" on public.reward_deliveries;
create policy "Admins manage reward deliveries" on public.reward_deliveries for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

-- Explicit grants: user cannot forge progress or claim inventory through Data API.
revoke insert, update, delete on public.reward_sessions from anon, authenticated;
revoke insert, update, delete on public.reward_deliveries from anon, authenticated;
revoke select, insert, update, delete on public.trial_stock_items from anon, authenticated;
grant select on public.reward_campaigns, public.reward_campaign_products to anon, authenticated;
grant select on public.reward_sessions, public.reward_deliveries to authenticated;

commit;
