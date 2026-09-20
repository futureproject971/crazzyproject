-- CRAZZY PROJECT - PERFORMANCE INDEXES
-- Covers every public-schema foreign key currently reported by Supabase as unindexed.

begin;

create index if not exists idx_coupon_products_coupon_id on public.coupon_products (coupon_id);
create index if not exists idx_coupon_products_product_id on public.coupon_products (product_id);
create index if not exists idx_coupon_usage_user_id on public.coupon_usage (user_id);
create index if not exists idx_coupon_users_coupon_id on public.coupon_users (coupon_id);
create index if not exists idx_coupon_users_user_id on public.coupon_users (user_id);
create index if not exists idx_lzt_sales_buyer_user_id on public.lzt_sales (buyer_user_id);
create index if not exists idx_order_tickets_product_id on public.order_tickets (product_id);
create index if not exists idx_order_tickets_product_plan_id on public.order_tickets (product_plan_id);
create index if not exists idx_order_tickets_stock_item_id on public.order_tickets (stock_item_id);
create index if not exists idx_order_tickets_user_id on public.order_tickets (user_id);
create index if not exists idx_payments_user_id on public.payments (user_id);
create index if not exists idx_product_features_product_id on public.product_features (product_id);
create index if not exists idx_product_media_product_id on public.product_media (product_id);
create index if not exists idx_product_plans_product_id on public.product_plans (product_id);
create index if not exists idx_product_reviews_product_id on public.product_reviews (product_id);
create index if not exists idx_products_game_id on public.products (game_id);
create index if not exists idx_reseller_products_product_id on public.reseller_products (product_id);
create index if not exists idx_reseller_products_reseller_id on public.reseller_products (reseller_id);
create index if not exists idx_reseller_purchases_product_plan_id on public.reseller_purchases (product_plan_id);
create index if not exists idx_reseller_purchases_reseller_id on public.reseller_purchases (reseller_id);
create index if not exists idx_reseller_purchases_stock_item_id on public.reseller_purchases (stock_item_id);
create index if not exists idx_reward_campaign_products_product_id on public.reward_campaign_products (product_id);
create index if not exists idx_reward_campaign_products_product_plan_id on public.reward_campaign_products (product_plan_id);
create index if not exists idx_reward_deliveries_delivered_by on public.reward_deliveries (delivered_by);
create index if not exists idx_reward_deliveries_trial_stock_item_id on public.reward_deliveries (trial_stock_item_id);
create index if not exists idx_reward_deliveries_user_id on public.reward_deliveries (user_id);
create index if not exists idx_reward_sessions_campaign_id on public.reward_sessions (campaign_id);
create index if not exists idx_reward_sessions_campaign_product_id on public.reward_sessions (campaign_product_id);
create index if not exists idx_reward_sessions_product_id on public.reward_sessions (product_id);
create index if not exists idx_reward_sessions_product_plan_id on public.reward_sessions (product_plan_id);
create index if not exists support_tickets_user_created_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_updated_idx on public.support_tickets (status, updated_at desc);
create index if not exists support_messages_ticket_created_idx on public.support_messages (ticket_id, created_at);
create index if not exists support_messages_sender_idx on public.support_messages (sender_id);
create index if not exists idx_ticket_messages_sender_id on public.ticket_messages (sender_id);
create index if not exists idx_ticket_messages_ticket_id on public.ticket_messages (ticket_id);
create index if not exists idx_trial_stock_items_used_by on public.trial_stock_items (used_by);
create index if not exists idx_user_login_ips_user_id on public.user_login_ips (user_id);

commit;
