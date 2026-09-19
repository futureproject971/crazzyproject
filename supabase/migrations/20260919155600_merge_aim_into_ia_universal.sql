-- CRAZZY PROJECT - consolidar AIM/Aimbot Universal em IA Universal
-- Mantem produtos existentes e remove categorias duplicadas da navegacao/catalogo ativo.

begin;

insert into public.games (name, slug, active, sort_order)
values ('IA Universal', 'ia-universal', true, 6)
on conflict (slug) do update
set name = excluded.name,
    active = true,
    sort_order = excluded.sort_order;

update public.products p
set game_id = ia.id
from public.games duplicate_game
join public.games ia on ia.slug = 'ia-universal'
where duplicate_game.slug in ('aim-universal', 'aimbot-universal')
  and p.game_id = duplicate_game.id;

update public.games
set active = false
where slug in ('aim-universal', 'aimbot-universal');

commit;
