-- CRAZZY PROJECT - categorias canonicas da Home
-- Mantem as categorias da referencia disponiveis no catalogo/admin.
-- Idempotente: nao remove categorias extras e nao sobrescreve image_url.

begin;

insert into public.games (name, slug, active, sort_order)
values
  ('Call of Duty Warzone', 'warzone', true, 0),
  ('Valorant', 'valorant', true, 1),
  ('Apex', 'apex', true, 2),
  ('FiveM', 'fivem', true, 3),
  ('GTA Online', 'gta-online', true, 4),
  ('BloodStrike', 'bloodstrike', true, 5),
  ('IA Universal', 'ia-universal', true, 6),
  ('AIM Universal', 'aim-universal', true, 7),
  ('Aimbot Universal', 'aimbot-universal', true, 8),
  ('Dead by Daylight', 'dead-by-daylight', true, 9),
  ('ARC Raiders', 'arc-raiders', true, 10),
  ('Vanguard Emulator', 'vanguard-emulator', true, 11),
  ('Rust', 'rust', true, 12),
  ('Hell Let Loose', 'hell-let-loose', true, 13),
  ('SCUM', 'scum', true, 14),
  ('Squad', 'squad', true, 15),
  ('War Dogs', 'war-dogs', true, 16),
  ('Counter-Strike 2', 'counter-strike-2', true, 17)
on conflict (slug) do update
set
  name = excluded.name,
  active = true,
  sort_order = excluded.sort_order;

commit;
