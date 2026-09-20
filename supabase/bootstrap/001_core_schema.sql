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

-- Auto-create profile on signup/social OAuth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  INSERT INTO public.profiles (user_id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'preferred_username', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'usuario'
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
    )
  )
  ON CONFLICT (user_id) DO UPDATE
  SET username = COALESCE(public.profiles.username, EXCLUDED.username),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$;

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

-- Cliente só lê conteúdo de estoque que foi efetivamente entregue em um pedido próprio.
CREATE POLICY "Users can view delivered own stock"
ON public.stock_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_tickets ot
    WHERE ot.stock_item_id = stock_items.id
      AND ot.user_id = auth.uid()
  )
);

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

-- Atomic paid-delivery function is defined in 002_security_hardening.sql.



-- ============================================
-- PAYMENT SETTINGS
-- ============================================
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payment settings" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment settings" ON public.payment_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_settings (method, label, enabled) VALUES
  ('pix', 'PIX', false),
  ('card', 'Cartão de Crédito', false),
  ('crypto', 'Litecoin (LTC)', false);

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
CREATE POLICY "Users can view own coupon usage" ON public.coupon_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage coupon usage" ON public.coupon_usage FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
-- SUPPORT HUB (Discord-style support, independent from paid orders)
-- ============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 120),
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('general','pre_sale','payment','product','technical','order')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','waiting_staff','waiting_user','resolved','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support tickets visible to owner or admin" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own support tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update support tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete support tickets" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','staff')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support messages visible to owner or admin" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND st.user_id = auth.uid()
    )
  );
CREATE POLICY "Support message insert user or admin" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'admin')
      AND sender_id = auth.uid()
      AND sender_role = 'staff'
    )
    OR
    (
      sender_id = auth.uid()
      AND sender_role = 'user'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = support_messages.ticket_id
          AND st.user_id = auth.uid()
          AND st.status <> 'closed'
      )
    )
  );
CREATE POLICY "Admins update support messages" ON public.support_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete support messages" ON public.support_messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX support_tickets_user_created_idx
  ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX support_tickets_status_updated_idx
  ON public.support_tickets (status, updated_at DESC);
CREATE INDEX support_messages_ticket_created_idx
  ON public.support_messages (ticket_id, created_at);
CREATE INDEX support_messages_sender_idx
  ON public.support_messages (sender_id);

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
