-- UsePaySync: IDs externos para produtos e planos (https://usepaysync.com/documentacao)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usepaysync_product_id TEXT;
ALTER TABLE public.product_plans ADD COLUMN IF NOT EXISTS usepaysync_plan_id TEXT;

COMMENT ON COLUMN public.products.usepaysync_product_id IS 'ID do produto na UsePaySync';
COMMENT ON COLUMN public.product_plans.usepaysync_plan_id IS 'ID do plano na UsePaySync';
