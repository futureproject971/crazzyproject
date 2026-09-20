begin;

create or replace function private.touch_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  update public.support_tickets
  set
    updated_at = now(),
    status = case
      when new.sender_role = 'user' and status <> 'closed' then 'waiting_staff'
      when new.sender_role = 'staff' and status not in ('closed', 'resolved') then 'waiting_user'
      else status
    end
  where id = new.ticket_id;

  return new;
end;
$$;

revoke all on function private.touch_support_ticket() from public, anon, authenticated, service_role;

drop trigger if exists touch_support_ticket_on_message on public.support_messages;
create trigger touch_support_ticket_on_message
after insert on public.support_messages
for each row execute function private.touch_support_ticket();

commit;
