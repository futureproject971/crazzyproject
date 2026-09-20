import { describe, expect, it } from 'vitest';
import { validateSupabaseTarget } from '../../scripts/supabase-target.mjs';

const ref = 'nnmglkdpmffmaiuwbcct';
const env = {
  VITE_SUPABASE_PROJECT_ID: ref,
  VITE_SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
};
const jwt = (role: string, project = ref) => `header.${Buffer.from(JSON.stringify({ role, ref: project })).toString('base64url')}.signature`;

describe('Supabase deployment configuration', () => {
  it('accepts public keys and matching legacy anon keys', () => {
    expect(() => validateSupabaseTarget(env, ref)).not.toThrow();
    expect(() => validateSupabaseTarget({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }, ref)).not.toThrow();
  });
  it.each(Object.keys(env))('rejects missing %s', (name) => {
    expect(() => validateSupabaseTarget({ ...env, [name]: '' }, ref)).toThrow();
  });
  it('rejects an old URL even with the correct explicit project ID', () => {
    expect(() => validateSupabaseTarget({ ...env, VITE_SUPABASE_URL: 'https://old.supabase.co' }, ref)).toThrow();
  });
  it('rejects a legacy key from another project', () => {
    expect(() => validateSupabaseTarget({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon', 'old') }, ref)).toThrow();
  });
  it.each(['sb_secret_example', 'ps_live_example', jwt('service_role')])('rejects private credentials without printing them', (secret) => {
    try {
      validateSupabaseTarget({ ...env, VITE_OTHER: secret }, ref);
      throw new Error('accepted');
    } catch (error) {
      expect((error as Error).message).toContain('[CRAZZY]');
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
