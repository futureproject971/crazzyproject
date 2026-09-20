import fs from 'node:fs';
import { loadEnv } from 'vite';
import { validateSupabaseTarget } from './supabase-target.mjs';
const mode = process.argv[2] || 'production';
const config = fs.readFileSync('supabase/config.toml', 'utf8');
try {
  validateSupabaseTarget(loadEnv(mode, process.cwd(), 'VITE_'), config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]);
  console.log('[CRAZZY] Configuração pública alinhada ao Supabase configurado.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
