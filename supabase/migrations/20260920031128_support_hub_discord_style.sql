-- CRAZZY PROJECT - Discord-style support hub.
-- Separate from paid order tickets so customers can ask for help before buying.

begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  category text not null default 'general'
    check (category in ('general','pre_sale','payment','product','technical','order')),
  status text not null default 'open'
    check (status in ('open','waiting_staff','waiting_user','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','staff')),
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "Support tickets visible to owner or admin" on public.support_tickets;
create policy "Support tickets visible to owner or admin"
on public.support_tickets
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or private.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "Users create own support tickets" on public.support_tickets;
create policy "Users create own support tickets"
on public.support_tickets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Admins update support tickets" on public.support_tickets;
create policy "Admins update support tickets"
on public.support_tickets
for update
to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins delete support tickets" on public.support_tickets;
create policy "Admins delete support tickets"
on public.support_tickets
for delete
to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Support messages visible to owner or admin" on public.support_messages;
create policy "Support messages visible to owner or admin"
on public.support_messages
for select
to authenticated
using (
  private.has_role((select auth.uid()), 'admin'::public.app_role)
  or exists (
    select 1
    from public.support_tickets st
    where st.id = support_messages.ticket_id
      and st.user_id = (select auth.uid())
  )
);

drop policy if exists "Support message insert user or admin" on public.support_messages;
create policy "Support message insert user or admin"
on public.support_messages
for insert
to authenticated
with check (
  (
    private.has_role((select auth.uid()), 'admin'::public.app_role)
    and sender_id = (select auth.uid())
    and sender_role = 'staff'
  )
  or
  (
    sender_id = (select auth.uid())
    and sender_role = 'user'
    and exists (
      select 1
      from public.support_tickets st
      where st.id = support_messages.ticket_id
        and st.user_id = (select auth.uid())
        and st.status <> 'closed'
    )
  )
);

drop policy if exists "Admins update support messages" on public.support_messages;
create policy "Admins update support messages"
on public.support_messages
for update
to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins delete support messages" on public.support_messages;
create policy "Admins delete support messages"
on public.support_messages
for delete
to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

create index if not exists support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_updated_idx
  on public.support_tickets (status, updated_at desc);
create index if not exists support_messages_ticket_created_idx
  on public.support_messages (ticket_id, created_at);

drop trigger if exists update_support_tickets_updated_at on public.support_tickets;
create trigger update_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.update_updated_at_column();

revoke all privileges on table public.support_tickets from anon;
revoke all privileges on table public.support_messages from anon;
grant select, insert, update, delete on table public.support_tickets to authenticated;
grant select, insert, update, delete on table public.support_messages to authenticated;
grant all privileges on table public.support_tickets to service_role;
grant all privileges on table public.support_messages to service_role;

commit;
