-- CRAZZY PROJECT - explicit Data API grants for fresh Supabase projects.
-- RLS remains the row-authorization layer, but grants are now an allowlist:
-- browser roles lose all automatic table privileges first, then receive only what the app needs.

begin;

grant usage on schema public to anon, authenticated, service_role;

-- Remove Supabase/Postgres automatic table exposure for browser roles.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

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

-- Public profile surface is intentionally column-limited.
grant select (user_id, username, avatar_url) on public.profiles to anon, authenticated;

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
grant update (username, avatar_url) on public.profiles to authenticated;

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

-- Only the Discord invite row is visible publicly, enforced by RLS.
grant select on public.system_credentials to anon;

-- Support Hub: visible only to authenticated users; RLS separates owners from admins.
grant select, insert, update, delete on table
  public.support_tickets,
  public.support_messages
  to authenticated;

-- Promo scratch card: users can only read their own reveal; inserts happen via Edge Function/service role.
grant select on table public.promo_daily_reveals to authenticated;

-- Rewards: public catalog + signed-in own state; admin writes are RLS-gated.
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
