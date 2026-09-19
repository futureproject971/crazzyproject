// Build-time checks only. Never print values: they may contain credentials.
export function validateSupabaseTarget(env, ref) {
  const fail = (message) => { throw new Error(`[CRAZZY] ${message}`); };
  const payload = (value) => {
    try { return JSON.parse(Buffer.from(String(value).split('.')[1] || '', 'base64url').toString()); }
    catch { return {}; }
  };
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    if (/SECRET|SERVICE_ROLE|PURINCASH_API_KEY|LZT_MARKET_TOKEN|LOVABLE_API_KEY/i.test(name)
      || /sb_secret_|ps_(live|test)_/.test(String(value))
      || payload(value).role === 'service_role') {
      fail(`Credencial privada proibida no frontend: ${name}`);
    }
  }
  if (!ref || env.VITE_SUPABASE_PROJECT_ID !== ref) {
    fail('VITE_SUPABASE_PROJECT_ID ausente ou diferente de supabase/config.toml.');
  }
  if (env.VITE_SUPABASE_URL !== `https://${ref}.supabase.co`) {
    fail('VITE_SUPABASE_URL ausente ou diferente do projeto configurado.');
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return;
  const claims = payload(key);
  if (claims.role === 'anon' && claims.ref === ref) return;
  fail('VITE_SUPABASE_PUBLISHABLE_KEY ausente, inválida ou de outro projeto.');
}
