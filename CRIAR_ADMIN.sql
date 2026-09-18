-- ============================================
-- Script para criar o primeiro Admin
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Crie uma conta de usuário no app (signup) ou via Dashboard
-- 2. Copie o UUID do usuário (Dashboard → Auth → Users)
-- 3. Substitua 'SEU_USER_ID_AQUI' abaixo pelo UUID copiado
-- 4. Execute este script no SQL Editor do Supabase
--
-- ============================================

-- Adicionar role admin para um usuário
-- SUBSTITUA 'SEU_USER_ID_AQUI' pelo UUID do seu usuário!
INSERT INTO public.user_roles (user_id, role) 
VALUES ('SEU_USER_ID_AQUI', 'admin') 
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se foi criado corretamente
SELECT 
  u.email,
  ur.role,
  u.id as user_id
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.id = 'SEU_USER_ID_AQUI';  -- Substitua aqui também para verificar
