-- ============================================
-- Script para criar a tabela lzt_config
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Criar tipo app_role se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- 2. Criar tabela user_roles se não existir (necessária para has_role)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3. Criar função has_role se não existir
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

-- 4. Criar a tabela lzt_config se não existir
CREATE TABLE IF NOT EXISTS public.lzt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.5,
  max_fetch_price NUMERIC(10,2) NOT NULL DEFAULT 500,
  currency TEXT NOT NULL DEFAULT 'BRL',
  markup_valorant NUMERIC(5,2),
  markup_lol NUMERIC(5,2),
  markup_fortnite NUMERIC(5,2),
  markup_minecraft NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Adicionar colunas de markup por jogo se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lzt_config' AND column_name = 'markup_valorant') THEN
    ALTER TABLE public.lzt_config ADD COLUMN markup_valorant NUMERIC(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lzt_config' AND column_name = 'markup_lol') THEN
    ALTER TABLE public.lzt_config ADD COLUMN markup_lol NUMERIC(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lzt_config' AND column_name = 'markup_fortnite') THEN
    ALTER TABLE public.lzt_config ADD COLUMN markup_fortnite NUMERIC(5,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lzt_config' AND column_name = 'markup_minecraft') THEN
    ALTER TABLE public.lzt_config ADD COLUMN markup_minecraft NUMERIC(5,2);
  END IF;
END $$;

-- 6. Habilitar RLS
ALTER TABLE public.lzt_config ENABLE ROW LEVEL SECURITY;

-- 7. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Anyone can view lzt config" ON public.lzt_config;
DROP POLICY IF EXISTS "Admins can manage lzt config" ON public.lzt_config;
DROP POLICY IF EXISTS "Anon can view lzt_config" ON public.lzt_config;
DROP POLICY IF EXISTS "Admins can manage lzt_config" ON public.lzt_config;

-- 8. Criar política para leitura pública
CREATE POLICY "Anyone can view lzt config" 
  ON public.lzt_config FOR SELECT 
  USING (true);

-- 9. Criar política para admins
-- Se has_role não funcionar, você pode ajustar depois via Dashboard
CREATE POLICY "Admins can manage lzt config" 
  ON public.lzt_config FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 10. Inserir dados padrão (apenas se a tabela estiver vazia)
INSERT INTO public.lzt_config (
  markup_multiplier, 
  max_fetch_price,
  markup_valorant,
  markup_lol,
  markup_fortnite,
  markup_minecraft
) 
SELECT 1.5, 500, 1.5, 1.5, 1.5, 1.5
WHERE NOT EXISTS (SELECT 1 FROM public.lzt_config);

-- 11. Atualizar valores padrão se já existir mas sem os campos de markup por jogo
UPDATE public.lzt_config 
SET 
  markup_valorant = COALESCE(markup_valorant, markup_multiplier),
  markup_lol = COALESCE(markup_lol, markup_multiplier),
  markup_fortnite = COALESCE(markup_fortnite, markup_multiplier),
  markup_minecraft = COALESCE(markup_minecraft, markup_multiplier)
WHERE markup_valorant IS NULL OR markup_lol IS NULL OR markup_fortnite IS NULL OR markup_minecraft IS NULL;
