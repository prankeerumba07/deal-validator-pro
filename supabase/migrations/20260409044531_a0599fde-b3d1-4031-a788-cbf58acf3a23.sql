
-- Add pricing breakdown fields to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS mrp numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_sale_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prepay_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_payable numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_price_claimed numeric DEFAULT 0;

-- Add detailed validation fields to validation_results
ALTER TABLE public.validation_results
  ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_post_coupon numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_final numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_results jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_analysis text DEFAULT NULL;
