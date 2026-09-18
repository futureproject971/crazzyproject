-- 1) Permitir que qualquer visitante leia a URL do Discord (botão flutuante)
CREATE POLICY "Public can read Discord URL"
  ON public.system_credentials FOR SELECT
  USING (env_key = 'DISCORD_INVITE_URL');

-- 2) Remover FlowPay e garantir UsePaySync (se FlowPay ainda existir)
DELETE FROM public.system_credentials WHERE env_key = 'FLOWPAY_API_KEY';
INSERT INTO public.system_credentials (name, env_key, description, help_url)
VALUES
  ('UsePaySync API Key', 'USEPAYSYNC_API_KEY', 'Chave da API UsePaySync para processar pagamentos PIX, cartão e cripto.', 'https://usepaysync.com/documentacao'),
  ('UsePaySync Webhook Secret', 'PAYSYNC_WEBHOOK_SECRET', 'Segredo para validar callbacks de pagamento.', 'https://usepaysync.com/documentacao')
ON CONFLICT (env_key) DO NOTHING;
