-- UsePaySync: credenciais para pix-payment (projeto usa UsePaySync direto, sem FlowPay)
-- Remove FlowPay se existir (de migrações antigas) e garante UsePaySync + webhook
DELETE FROM public.system_credentials WHERE env_key = 'FLOWPAY_API_KEY';

INSERT INTO public.system_credentials (name, env_key, description, help_url)
VALUES
  ('UsePaySync API Key', 'USEPAYSYNC_API_KEY', 'Chave da API UsePaySync para processar pagamentos PIX, cartão e cripto.', 'https://usepaysync.com/documentacao'),
  ('UsePaySync Webhook Secret', 'PAYSYNC_WEBHOOK_SECRET', 'Segredo para validar callbacks de pagamento. UsePaySync envia ?secret=XXX na URL do webhook.', 'https://usepaysync.com/documentacao')
ON CONFLICT (env_key) DO NOTHING;
