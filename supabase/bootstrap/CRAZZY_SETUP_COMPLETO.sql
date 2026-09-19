-- CRAZZY PROJECT - SETUP COMPLETO PARA SUPABASE NOVO
-- Arquivo gerado a partir dos 4 bootstraps canônicos.
-- Pode ser executado inteiro no SQL Editor de um projeto Supabase NOVO/Vazio.
-- NÃO use para sobrescrever banco de produção existente sem revisar diferenças.
-- Ordem: Core -> Hardening -> Rewards -> Grants.

-- ============================================================
-- SOURCE: supabase/bootstrap/001_core_schema.sql
-- ============================================================

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


-- ============================================================
-- SOURCE: supabase/bootstrap/002_security_hardening.sql
-- ============================================================

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


-- ============================================================
-- RLS PERFORMANCE: avoid re-evaluating auth.uid() for every row.
-- Preserve each policy expression and only wrap direct auth.uid() calls in a scalar
-- subquery so Postgres can use an initPlan.
-- ============================================================
do $
declare
  pol record;
  stmt text;
  new_qual text;
  new_check text;
begin
  for pol in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (coalesce(qual, '') like '%auth.uid()%' and coalesce(qual, '') not ilike '%select auth.uid()%')
        or
        (coalesce(with_check, '') like '%auth.uid()%' and coalesce(with_check, '') not ilike '%select auth.uid()%')
      )
  loop
    new_qual := case when pol.qual is null then null else replace(pol.qual, 'auth.uid()', '(select auth.uid())') end;
    new_check := case when pol.with_check is null then null else replace(pol.with_check, 'auth.uid()', '(select auth.uid())') end;

    stmt := format('alter policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end
$;

commit;


-- ============================================================
-- SOURCE: supabase/bootstrap/003_rewards.sql
-- ============================================================

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
  using (private.has_role((select auth.uid()), 'admin'))
  with check (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward products" on public.reward_campaign_products;
create policy "Admins manage reward products" on public.reward_campaign_products for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'))
  with check (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage trial stock" on public.trial_stock_items;
create policy "Admins manage trial stock" on public.trial_stock_items for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'))
  with check (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward sessions" on public.reward_sessions;
create policy "Admins manage reward sessions" on public.reward_sessions for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'))
  with check (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward deliveries" on public.reward_deliveries;
create policy "Admins manage reward deliveries" on public.reward_deliveries for all to authenticated
  using (private.has_role((select auth.uid()), 'admin'))
  with check (private.has_role((select auth.uid()), 'admin'));

-- Explicit grants: user cannot forge progress or claim inventory through Data API.
revoke insert, update, delete on public.reward_sessions from anon, authenticated;
revoke insert, update, delete on public.reward_deliveries from anon, authenticated;
revoke select, insert, update, delete on public.trial_stock_items from anon, authenticated;
grant select on public.reward_campaigns, public.reward_campaign_products to anon, authenticated;
grant select on public.reward_sessions, public.reward_deliveries to authenticated;

commit;


-- ============================================================
-- SOURCE: supabase/bootstrap/004_access_grants.sql
-- ============================================================

-- CRAZZY PROJECT - explicit Data API grants for fresh Supabase projects.
-- RLS remains the authorization layer. These grants only expose the operations that
-- each browser role may attempt; the policies decide which rows are actually allowed.

begin;

grant usage on schema public to anon, authenticated, service_role;

-- Public storefront catalog.
grant select on table
  public.games,
  public.products,
  public.product_plans,
  public.product_media,
  public.product_features,
  public.product_reviews,
  public.payment_settings
  to anon;

-- Authenticated storefront/customer reads.
grant select on table
  public.games,
  public.products,
  public.product_plans,
  public.product_media,
  public.product_features,
  public.product_reviews,
  public.user_roles,
  public.user_login_ips,
  public.stock_items,
  public.order_tickets,
  public.ticket_messages,
  public.payments,
  public.coupons,
  public.coupon_products,
  public.coupon_users,
  public.coupon_usage,
  public.resellers,
  public.reseller_products,
  public.reseller_purchases,
  public.lzt_config,
  public.lzt_sales,
  public.system_credentials
  to authenticated;

-- User-authored records. RLS restricts these to owned rows.
grant insert, update, delete on public.product_reviews to authenticated;
grant insert on public.user_login_ips to authenticated;
grant insert on public.ticket_messages to authenticated;

-- Admin panel mutations. Normal customers still fail RLS because every write policy on
-- these tables is admin-only. Payment facts and coupon_usage are deliberately excluded.
grant insert, update, delete on table
  public.games,
  public.products,
  public.product_plans,
  public.product_media,
  public.product_features,
  public.stock_items,
  public.order_tickets,
  public.ticket_messages,
  public.coupons,
  public.coupon_products,
  public.coupon_users,
  public.resellers,
  public.reseller_products,
  public.reseller_purchases,
  public.lzt_config,
  public.lzt_sales,
  public.system_credentials,
  public.user_roles
  to authenticated;

-- Only the Discord invite row is visible publicly, enforced by the RLS policy created in
-- the hardening step. Secrets never live in this table.
grant select on public.system_credentials to anon;

-- Rewards: customers can read catalog + own status; admin policies permit management.
grant select on public.reward_campaigns, public.reward_campaign_products to anon;
grant select, insert, update, delete on table
  public.reward_campaigns,
  public.reward_campaign_products,
  public.trial_stock_items,
  public.reward_sessions,
  public.reward_deliveries
  to authenticated;

-- Edge Functions use service_role for server-owned facts and atomic fulfillment.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

commit;

