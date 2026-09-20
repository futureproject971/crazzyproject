-- CRAZZY PROJECT - payment methods fail closed until gateway secrets are configured and tested.

begin;

update public.payment_settings
set enabled = false,
    updated_at = now()
where method in ('pix','card','crypto');

commit;
