
-- Fix RLS on stock_items: users can ONLY see stock that was delivered to them
-- via a ticket with status 'delivered' or later (not 'open' where delivery hasn't happened yet)

DROP POLICY IF EXISTS "Users can view own delivered stock" ON public.stock_items;

CREATE POLICY "Users can view own delivered stock"
ON public.stock_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.order_tickets
    WHERE order_tickets.stock_item_id = stock_items.id
      AND order_tickets.user_id = auth.uid()
      AND order_tickets.status IN ('delivered', 'resolved', 'closed', 'finished', 'archived')
  )
);
