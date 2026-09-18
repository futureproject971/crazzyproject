-- CRAZZY PROJECT - explicit Data API grants for fresh Supabase projects.
-- RLS remains the authorization layer. These grants only expose the operations that
-- each browser role may attempt; the policies decide which rows are actually allowed.

begin;

grant usage on schema public to anon, authenticated, service_role;

-- Public storefront catalog.
grant select on table
  public.games,
  public.products,
  public.product_plans,
  public.product_media,
  public.product_features,
  public.product_reviews,
  public.payment_settings
  to anon;

-- Authenticated storefront/customer reads.
grant select on table
  public.games,
  public.products,
  public.product_plans,
  public.product_media,
  public.product_features,
  public.product_reviews,
  public.user_roles,
  public.user_login_ips,
  public.stock_items,
  public.order_tickets,
  public.ticket_messages,
  public.payments,
  public.coupons,
  public.coupon_products,
  public.coupon_users,
  public.coupon_usage,
  public.resellers,
  public.reseller_products,
  public.reseller_purchases,
  public.lzt_config,
  public.lzt_sales,
  public.system_credentials
  to authenticated;

-- User-authored records. RLS restricts these to owned rows.
grant insert, update, delete on public.product_reviews to authenticated;
grant insert on public.user_login_ips to authenticated;
grant insert on public.ticket_messages to authenticated;

-- Admin panel mutations. Normal customers still fail RLS because every write policy on
-- these tables is admin-only. Payment facts and coupon_usage are deliberately excluded.
grant insert, update, delete on table
  public.games,
  public.products,
  public.product_plans,
  public.product_media,
  public.product_features,
  public.stock_items,
  public.order_tickets,
  public.ticket_messages,
  public.coupons,
  public.coupon_products,
  public.coupon_users,
  public.resellers,
  public.reseller_products,
  public.reseller_purchases,
  public.lzt_config,
  public.lzt_sales,
  public.system_credentials,
  public.user_roles
  to authenticated;

-- Only the Discord invite row is visible publicly, enforced by the RLS policy created in
-- the hardening step. Secrets never live in this table.
grant select on public.system_credentials to anon;

-- Rewards: customers can read catalog + own status; admin policies permit management.
grant select on public.reward_campaigns, public.reward_campaign_products to anon;
grant select, insert, update, delete on table
  public.reward_campaigns,
  public.reward_campaign_products,
  public.trial_stock_items,
  public.reward_sessions,
  public.reward_deliveries
  to authenticated;

-- Edge Functions use service_role for server-owned facts and atomic fulfillment.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

commit;
