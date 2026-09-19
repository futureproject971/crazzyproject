-- CRAZZY PROJECT - produtos NOVO/destaque + consolidacao IA Universal
-- Idempotente e segura para bases existentes.

begin;

alter table public.products
  add column if not exists is_new boolean not null default false;

create index if not exists products_active_is_new_sort_idx
  on public.products (active, is_new, sort_order);

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
where duplicate_game.slug = 'aimbot-universal'
  and p.game_id = duplicate_game.id;

update public.games
set active = false
where slug = 'aimbot-universal';

commit;
