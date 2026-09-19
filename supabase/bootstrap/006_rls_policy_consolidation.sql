-- CRAZZY PROJECT - CONSOLIDATE RLS POLICIES
-- Keeps one permissive policy per role/action wherever possible and removes a weaker stock read path.

begin;

do $$
declare
  t text;
  p text;
begin
  for t,p in
    select * from (values
      ('coupon_products','Admins can manage coupon products'),
      ('coupon_users','Admins can manage coupon users'),
      ('coupons','Admins can manage coupons'),
      ('games','Admins can manage games'),
      ('lzt_config','Admins can manage lzt config'),
      ('payment_settings','Admins can manage payment settings'),
      ('product_features','Admins can manage features'),
      ('product_media','Admins can manage media'),
      ('product_plans','Admins can manage plans'),
      ('products','Admins can manage products')
    ) as v(table_name, policy_name)
  loop
    execute format('drop policy if exists %I on public.%I', p, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_role((select auth.uid()), ''admin''))', p || ' insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_role((select auth.uid()), ''admin'')) with check (private.has_role((select auth.uid()), ''admin''))', p || ' update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_role((select auth.uid()), ''admin''))', p || ' delete', t);
  end loop;
end
$$;

drop policy if exists "Admins can manage coupon usage" on public.coupon_usage;
drop policy if exists "Users can view own coupon usage" on public.coupon_usage;
create policy "Coupon usage visible to owner or admin" on public.coupon_usage for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins can insert coupon usage" on public.coupon_usage for insert to authenticated
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can update coupon usage" on public.coupon_usage for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can delete coupon usage" on public.coupon_usage for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage all tickets" on public.order_tickets;
drop policy if exists "Users can view own tickets" on public.order_tickets;
create policy "Tickets visible to owner or admin" on public.order_tickets for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins can insert tickets" on public.order_tickets for insert to authenticated
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can update tickets" on public.order_tickets for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can delete tickets" on public.order_tickets for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage all payments" on public.payments;
drop policy if exists "Users can view own payments" on public.payments;
create policy "Payments visible to owner or admin" on public.payments for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins can insert payments" on public.payments for insert to authenticated
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can update payments" on public.payments for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can delete payments" on public.payments for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage reviews" on public.product_reviews;
drop policy if exists "Users can insert purchased product reviews" on public.product_reviews;
drop policy if exists "Users can update purchased product reviews" on public.product_reviews;
drop policy if exists "Users can delete own reviews" on public.product_reviews;
create policy "Purchased review insert or admin" on public.product_reviews for insert to authenticated
  with check (
    private.has_role((select auth.uid()), 'admin')
    or (
      (select auth.uid()) = user_id and rating between 1 and 5
      and exists (
        select 1 from public.order_tickets ot
        where ot.user_id = (select auth.uid())
          and ot.product_id = product_reviews.product_id
          and ot.status in ('delivered','resolved','closed','finished','archived')
      )
    )
  );
create policy "Purchased review update or admin" on public.product_reviews for update to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'))
  with check (
    private.has_role((select auth.uid()), 'admin')
    or (
      (select auth.uid()) = user_id and rating between 1 and 5
      and exists (
        select 1 from public.order_tickets ot
        where ot.user_id = (select auth.uid())
          and ot.product_id = product_reviews.product_id
          and ot.status in ('delivered','resolved','closed','finished','archived')
      )
    )
  );
create policy "Review delete owner or admin" on public.product_reviews for delete to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Users can update own basic profile" on public.profiles;
create policy "Profile update owner or admin" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'))
  with check ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage resellers" on public.resellers;
drop policy if exists "Users can view own reseller" on public.resellers;
create policy "Reseller visible to owner or admin" on public.resellers for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins can insert resellers" on public.resellers for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can update resellers" on public.resellers for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can delete resellers" on public.resellers for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage reseller products" on public.reseller_products;
drop policy if exists "Users can view own reseller products" on public.reseller_products;
create policy "Reseller products visible to owner or admin" on public.reseller_products for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or exists (select 1 from public.resellers r where r.id = reseller_products.reseller_id and r.user_id = (select auth.uid()))
  );
create policy "Admins can insert reseller products" on public.reseller_products for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can update reseller products" on public.reseller_products for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can delete reseller products" on public.reseller_products for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage reseller purchases" on public.reseller_purchases;
drop policy if exists "Users can view own reseller purchases" on public.reseller_purchases;
create policy "Reseller purchases visible to owner or admin" on public.reseller_purchases for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or exists (select 1 from public.resellers r where r.id = reseller_purchases.reseller_id and r.user_id = (select auth.uid()))
  );
create policy "Admins can insert reseller purchases" on public.reseller_purchases for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can update reseller purchases" on public.reseller_purchases for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins can delete reseller purchases" on public.reseller_purchases for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward campaigns" on public.reward_campaigns;
drop policy if exists "Public can view active reward campaigns" on public.reward_campaigns;
create policy "Anon can view active reward campaigns" on public.reward_campaigns for select to anon using (active = true);
create policy "Authenticated can view active rewards or admin all" on public.reward_campaigns for select to authenticated
  using (active = true or private.has_role((select auth.uid()), 'admin'));
create policy "Admins insert reward campaigns" on public.reward_campaigns for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update reward campaigns" on public.reward_campaigns for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete reward campaigns" on public.reward_campaigns for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward products" on public.reward_campaign_products;
drop policy if exists "Public can view active reward products" on public.reward_campaign_products;
create policy "Anon can view active reward products" on public.reward_campaign_products for select to anon
  using (active = true and exists (select 1 from public.reward_campaigns c where c.id = campaign_id and c.active = true));
create policy "Authenticated can view active reward products or admin all" on public.reward_campaign_products for select to authenticated
  using (private.has_role((select auth.uid()), 'admin') or (active = true and exists (select 1 from public.reward_campaigns c where c.id = campaign_id and c.active = true)));
create policy "Admins insert reward products" on public.reward_campaign_products for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update reward products" on public.reward_campaign_products for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete reward products" on public.reward_campaign_products for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward sessions" on public.reward_sessions;
drop policy if exists "Users can view own reward sessions" on public.reward_sessions;
create policy "Reward sessions visible to owner or admin" on public.reward_sessions for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins insert reward sessions" on public.reward_sessions for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update reward sessions" on public.reward_sessions for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete reward sessions" on public.reward_sessions for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins manage reward deliveries" on public.reward_deliveries;
drop policy if exists "Users can view own reward deliveries" on public.reward_deliveries;
create policy "Reward deliveries visible to owner or admin" on public.reward_deliveries for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins insert reward deliveries" on public.reward_deliveries for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update reward deliveries" on public.reward_deliveries for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete reward deliveries" on public.reward_deliveries for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage stock" on public.stock_items;
drop policy if exists "Users can view delivered own stock" on public.stock_items;
drop policy if exists "Users can view own delivered stock" on public.stock_items;
create policy "Stock visible after delivery or to admin" on public.stock_items for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or exists (
      select 1 from public.order_tickets ot
      where ot.stock_item_id = stock_items.id
        and ot.user_id = (select auth.uid())
        and ot.status in ('delivered','resolved','closed','finished','archived')
    )
  );
create policy "Admins insert stock" on public.stock_items for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update stock" on public.stock_items for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete stock" on public.stock_items for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage credentials" on public.system_credentials;
drop policy if exists "Public can view Discord invite" on public.system_credentials;
create policy "Anon can view Discord invite" on public.system_credentials for select to anon using (env_key = 'DISCORD_INVITE_URL');
create policy "Authenticated can view Discord invite or admin all" on public.system_credentials for select to authenticated
  using (env_key = 'DISCORD_INVITE_URL' or private.has_role((select auth.uid()), 'admin'));
create policy "Admins insert credentials" on public.system_credentials for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update credentials" on public.system_credentials for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete credentials" on public.system_credentials for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage all messages" on public.ticket_messages;
drop policy if exists "Users can send messages on own tickets" on public.ticket_messages;
drop policy if exists "Users can view messages of own tickets" on public.ticket_messages;
create policy "Ticket messages visible to owner or admin" on public.ticket_messages for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or exists (select 1 from public.order_tickets ot where ot.id = ticket_messages.ticket_id and ot.user_id = (select auth.uid()))
  );
create policy "Ticket message insert user or admin" on public.ticket_messages for insert to authenticated
  with check (
    private.has_role((select auth.uid()), 'admin')
    or (
      sender_id = (select auth.uid()) and sender_role = 'user'
      and exists (select 1 from public.order_tickets ot where ot.id = ticket_messages.ticket_id and ot.user_id = (select auth.uid()))
    )
  );
create policy "Admins update ticket messages" on public.ticket_messages for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete ticket messages" on public.ticket_messages for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins can manage roles" on public.user_roles;
drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Roles visible to owner or admin" on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id or private.has_role((select auth.uid()), 'admin'));
create policy "Admins insert roles" on public.user_roles for insert to authenticated with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins update roles" on public.user_roles for update to authenticated
  using (private.has_role((select auth.uid()), 'admin')) with check (private.has_role((select auth.uid()), 'admin'));
create policy "Admins delete roles" on public.user_roles for delete to authenticated using (private.has_role((select auth.uid()), 'admin'));

drop policy if exists "Users can insert own IPs" on public.user_login_ips;
drop policy if exists "Users can view own IPs" on public.user_login_ips;
create policy "Users can insert own IPs" on public.user_login_ips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can view own IPs" on public.user_login_ips for select to authenticated using ((select auth.uid()) = user_id);

commit;
