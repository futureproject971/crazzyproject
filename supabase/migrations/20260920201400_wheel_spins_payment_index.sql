-- CRAZZY PROJECT - covering index for wheel payment foreign key.
begin;
create index if not exists wheel_spins_payment_idx
  on public.wheel_spins (payment_id)
  where payment_id is not null;
commit;
