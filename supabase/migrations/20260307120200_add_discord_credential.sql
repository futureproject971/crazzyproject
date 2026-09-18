-- Discord: link de convite configurável (botão flutuante + footer)
INSERT INTO public.system_credentials (name, env_key, description, help_url)
VALUES
  ('Discord Invite URL', 'DISCORD_INVITE_URL', 'Link de convite do seu servidor Discord. Usado no botão flutuante e no footer.', 'https://discord.com/developers/docs')
ON CONFLICT (env_key) DO NOTHING;
