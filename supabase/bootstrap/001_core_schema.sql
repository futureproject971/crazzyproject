-- CRAZZY PROJECT - FRESH DATABASE BOOTSTRAP
-- Built from the consolidated legacy schema, intentionally excluding historical data
-- migrations and old gateway-specific columns. Run only against a NEW empty project.


-- ============================================
-- ENUM
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============================================
-- HELPER: updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- USER ROLES (must be before has_role function)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- has_role function (now user_roles exists)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  banned BOOLEAN NOT NULL DEFAULT false,
  banned_at TIMESTAMPTZ,
  banned_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- USER LOGIN IPS
-- ============================================
CREATE TABLE public.user_login_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_login_ips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own IPs" ON public.user_login_ips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own IPs" ON public.user_login_ips FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- GAMES
-- ============================================
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Admins can manage games" ON public.games FOR ALL USING (public.has_role(auth.uid(), 'admin'));


-- Categorias oficiais da Home CRAZZY PROJECT.
-- Nao impede que o admin tenha categorias extras; apenas garante o conjunto canonico.
INSERT INTO public.games (name, slug, active, sort_order)
VALUES
  ('Call of Duty Warzone', 'warzone', true, 0),
  ('Valorant', 'valorant', true, 1),
  ('Apex', 'apex', true, 2),
  ('FiveM', 'fivem', true, 3),
  ('GTA Online', 'gta-online', true, 4),
  ('BloodStrike', 'bloodstrike', true, 5),
  ('IA Universal', 'ia-universal', true, 6),
  ('Dead by Daylight', 'dead-by-daylight', true, 7),
  ('ARC Raiders', 'arc-raiders', true, 8),
  ('Vanguard Emulator', 'vanguard-emulator', true, 9),
  ('Rust', 'rust', true, 10),
  ('Hell Let Loose', 'hell-let-loose', true, 11),
  ('SCUM', 'scum', true, 12),
  ('Squad', 'squad', true, 13),
  ('War Dogs', 'war-dogs', true, 14),
  ('Counter-Strike 2', 'counter-strike-2', true, 15)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    active = true,
    sort_order = EXCLUDED.sort_order;

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  features_text TEXT,
  image_url TEXT,
  is_new BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'undetected',
  status_label TEXT NOT NULL DEFAULT 'Indetectável',
  status_updated_at TIMESTAMPTZ,
  tutorial_text TEXT,
  tutorial_file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX products_active_is_new_sort_idx ON public.products (active, is_new, sort_order);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PRODUCT PLANS
-- ============================================
CREATE TABLE public.product_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plans" ON public.product_plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.product_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCT MEDIA
-- ============================================
CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view media" ON public.product_media FOR SELECT USING (true);
CREATE POLICY "Admins can manage media" ON public.product_media FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCT FEATURES
-- ============================================
CREATE TABLE public.product_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view features" ON public.product_features FOR SELECT USING (true);
CREATE POLICY "Admins can manage features" ON public.product_features FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PRODUCT REVIEWS
-- ============================================
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.product_reviews FOR SELECT USING (true);

-- ============================================
-- STOCK ITEMS
-- ============================================
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_plan_id UUID REFERENCES public.product_plans(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage stock" ON public.stock_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- REWARDS / TRIALS
-- ============================================
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

-- ============================================
-- ORDER TICKETS
-- ============================================
CREATE TABLE public.order_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_plan_id UUID REFERENCES public.product_plans(id) NOT NULL,
  stock_item_id UUID REFERENCES public.stock_items(id),
  status TEXT NOT NULL DEFAULT 'open',
  status_label TEXT NOT NULL DEFAULT 'Aberto',
  metadata JSONB,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.order_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.order_tickets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.order_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Avaliações só podem ser criadas/alteradas por quem possui pedido real do produto.
CREATE POLICY "Users can insert purchased product reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND rating BETWEEN 1 AND 5
  AND EXISTS (
    SELECT 1
    FROM public.order_tickets ot
    WHERE ot.user_id = auth.uid()
      AND ot.product_id = product_reviews.product_id
      AND ot.status IN ('delivered', 'resolved', 'closed', 'finished')
  )
);

CREATE POLICY "Users can update purchased product reviews"
ON public.product_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND rating BETWEEN 1 AND 5
  AND EXISTS (
    SELECT 1
    FROM public.order_tickets ot
    WHERE ot.user_id = auth.uid()
      AND ot.product_id = product_reviews.product_id
      AND ot.status IN ('delivered', 'resolved', 'closed', 'finished')
  )
);

CREATE POLICY "Users can delete own reviews"
ON public.product_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage reviews"
ON public.product_reviews
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TICKET MESSAGES
-- ============================================
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.order_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages of own tickets" ON public.ticket_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.order_tickets WHERE id = ticket_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert messages on own tickets" ON public.ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'user'
    AND EXISTS (
      SELECT 1
      FROM public.order_tickets
      WHERE id = ticket_id
        AND user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage all messages" ON public.ticket_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  charge_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  cart_snapshot JSONB,
  coupon_id UUID,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bind each paid cart unit to exactly one ticket. This makes payment polling/webhook
-- retries idempotent and prevents consuming two stock keys for the same paid unit.
ALTER TABLE public.order_tickets
  ADD COLUMN payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN payment_item_index INTEGER,
  ADD COLUMN payment_unit_index INTEGER;

CREATE UNIQUE INDEX order_tickets_payment_unit_unique
  ON public.order_tickets (payment_id, payment_item_index, payment_unit_index)
  WHERE payment_id IS NOT NULL;

CREATE INDEX stock_items_available_plan_idx
  ON public.stock_items (product_plan_id, used, created_at);

CREATE OR REPLACE FUNCTION public.claim_paid_delivery(
  p_payment_id UUID,
  p_user_id UUID,
  p_product_id UUID,
  p_product_plan_id UUID,
  p_item_index INTEGER,
  p_unit_index INTEGER
)
RETURNS TABLE(ticket_id UUID, stock_item_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID;
  v_stock_id UUID;
BEGIN
  IF p_item_index < 0 OR p_unit_index < 0 THEN
    RAISE EXCEPTION 'Invalid delivery unit index';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.id = p_payment_id
      AND p.user_id = p_user_id
      AND p.status IN ('FULFILLING', 'COMPLETED')
  ) THEN
    RAISE EXCEPTION 'Payment is not eligible for delivery';
  END IF;

  SELECT ot.id, ot.stock_item_id
  INTO v_ticket_id, v_stock_id
  FROM public.order_tickets ot
  WHERE ot.payment_id = p_payment_id
    AND ot.payment_item_index = p_item_index
    AND ot.payment_unit_index = p_unit_index
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_ticket_id, v_stock_id, false;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.product_plans pp
    JOIN public.products pr ON pr.id = pp.product_id
    WHERE pp.id = p_product_plan_id
      AND pp.product_id = p_product_id
      AND pp.active = true
      AND pr.active = true
  ) THEN
    RAISE EXCEPTION 'Product or plan is not active';
  END IF;

  BEGIN
    SELECT si.id
    INTO v_stock_id
    FROM public.stock_items si
    WHERE si.product_plan_id = p_product_plan_id
      AND si.used = false
    ORDER BY si.created_at, si.id
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_stock_id IS NOT NULL THEN
      UPDATE public.stock_items
      SET used = true,
          used_at = now()
      WHERE id = v_stock_id
        AND used = false;
    END IF;

    INSERT INTO public.order_tickets (
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
    VALUES (
      p_user_id,
      p_product_id,
      p_product_plan_id,
      v_stock_id,
      CASE WHEN v_stock_id IS NULL THEN 'open' ELSE 'delivered' END,
      CASE WHEN v_stock_id IS NULL THEN 'Aguardando Entrega' ELSE 'Entregue' END,
      jsonb_build_object(
        'payment_id', p_payment_id,
        'payment_item_index', p_item_index,
        'payment_unit_index', p_unit_index
      ),
      p_payment_id,
      p_item_index,
      p_unit_index
    )
    RETURNING id INTO v_ticket_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT ot.id, ot.stock_item_id
    INTO v_ticket_id, v_stock_id
    FROM public.order_tickets ot
    WHERE ot.payment_id = p_payment_id
      AND ot.payment_item_index = p_item_index
      AND ot.payment_unit_index = p_unit_index
    LIMIT 1;

    IF v_ticket_id IS NULL THEN
      RAISE;
    END IF;

    RETURN QUERY SELECT v_ticket_id, v_stock_id, false;
    RETURN;
  END;

  RETURN QUERY SELECT v_ticket_id, v_stock_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_paid_delivery(UUID, UUID, UUID, UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_paid_delivery(UUID, UUID, UUID, UUID, INTEGER, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paid_delivery(UUID, UUID, UUID, UUID, INTEGER, INTEGER) TO service_role;

-- ============================================
-- PAYMENT SETTINGS
-- ============================================
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payment settings" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment settings" ON public.payment_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_settings (method, label, enabled) VALUES
  ('pix', 'PIX', true),
  ('card', 'Cartão de Crédito', false),
  ('crypto', 'Litecoin (LTC)', true);

-- ============================================
-- COUPONS
-- ============================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- COUPON PRODUCTS
-- ============================================
CREATE TABLE public.coupon_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL
);
ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view coupon products" ON public.coupon_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage coupon products" ON public.coupon_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- COUPON USERS
-- ============================================
CREATE TABLE public.coupon_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);
ALTER TABLE public.coupon_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view coupon users" ON public.coupon_users FOR SELECT USING (true);
CREATE POLICY "Admins can manage coupon users" ON public.coupon_users FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- COUPON USAGE
-- ============================================
CREATE TABLE public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own coupon usage" ON public.coupon_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.coupon_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage coupon usage" ON public.coupon_usage FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RESELLERS
-- ============================================
CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reseller" ON public.resellers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage resellers" ON public.resellers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RESELLER PRODUCTS
-- ============================================
CREATE TABLE public.reseller_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL
);
ALTER TABLE public.reseller_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reseller products" ON public.reseller_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.resellers WHERE id = reseller_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage reseller products" ON public.reseller_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RESELLER PURCHASES
-- ============================================
CREATE TABLE public.reseller_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  product_plan_id UUID REFERENCES public.product_plans(id) NOT NULL,
  stock_item_id UUID REFERENCES public.stock_items(id),
  original_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reseller_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reseller purchases" ON public.reseller_purchases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.resellers WHERE id = reseller_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage reseller purchases" ON public.reseller_purchases FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- LZT CONFIG
-- ============================================
CREATE TABLE public.lzt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.5,
  max_fetch_price NUMERIC(10,2) NOT NULL DEFAULT 500,
  currency TEXT NOT NULL DEFAULT 'BRL',
  markup_valorant NUMERIC NOT NULL DEFAULT 1.5,
  markup_lol NUMERIC NOT NULL DEFAULT 1.5,
  markup_fortnite NUMERIC NOT NULL DEFAULT 1.5,
  markup_minecraft NUMERIC NOT NULL DEFAULT 1.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lzt_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lzt config" ON public.lzt_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage lzt config" ON public.lzt_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.lzt_config (markup_multiplier, max_fetch_price) VALUES (1.5, 500);

-- ============================================
-- LZT SALES
-- ============================================
CREATE TABLE public.lzt_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lzt_item_id TEXT NOT NULL,
  buy_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  account_title TEXT,
  buyer_user_id UUID REFERENCES auth.users(id),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lzt_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage lzt sales" ON public.lzt_sales FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SYSTEM CREDENTIALS
-- ============================================
CREATE TABLE public.system_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  env_key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  help_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage credentials" ON public.system_credentials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RPC: increment reseller purchases
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_reseller_purchases(_reseller_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resellers
  SET total_purchases = total_purchases + 1
  WHERE id = _reseller_id;
$$;

REVOKE ALL ON FUNCTION public.increment_reseller_purchases(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_reseller_purchases(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reseller_purchases(UUID) TO service_role;

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('game-images', 'game-images', true);

CREATE POLICY "Anyone can view game images" ON storage.objects FOR SELECT USING (bucket_id = 'game-images');
CREATE POLICY "Admins can upload game images" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload own ticket files" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'game-images'
    AND (storage.foldername(name))[1] = 'ticket-files'
    AND EXISTS (
      SELECT 1
      FROM public.order_tickets ot
      WHERE ot.id::text = (storage.foldername(name))[2]
        AND ot.user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can update game images" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete game images" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'game-images' AND public.has_role(auth.uid(), 'admin'));
