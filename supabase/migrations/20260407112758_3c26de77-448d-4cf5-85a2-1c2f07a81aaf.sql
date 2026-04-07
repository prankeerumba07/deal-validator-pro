
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table 1: deals
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_name TEXT NOT NULL DEFAULT '',
  partner_site TEXT NOT NULL,
  product_url TEXT NOT NULL,
  expected_price NUMERIC NOT NULL,
  coupon_code TEXT,
  expected_cashback NUMERIC NOT NULL DEFAULT 0,
  expected_freebie TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid')),
  last_checked_at TIMESTAMPTZ,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read deals" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert deals" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update deals" ON public.deals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete deals" ON public.deals FOR DELETE USING (true);

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: validation_results
CREATE TABLE public.validation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  actual_price NUMERIC,
  coupon_status TEXT NOT NULL DEFAULT 'not_applied' CHECK (coupon_status IN ('working', 'failed', 'not_applied')),
  freebie_status TEXT NOT NULL DEFAULT 'not_checked' CHECK (freebie_status IN ('available', 'not_available', 'not_checked')),
  stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock')),
  final_status TEXT NOT NULL DEFAULT 'invalid' CHECK (final_status IN ('valid', 'invalid')),
  reason JSONB DEFAULT '[]'::jsonb,
  screenshot_url TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read validation_results" ON public.validation_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert validation_results" ON public.validation_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update validation_results" ON public.validation_results FOR UPDATE USING (true);

-- Table 3: validation_logs
CREATE TABLE public.validation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  run_id TEXT,
  status TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read validation_logs" ON public.validation_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert validation_logs" ON public.validation_logs FOR INSERT WITH CHECK (true);

-- Table 4: alerts
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_mismatch', 'coupon_failed', 'freebie_missing')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  description TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update alerts" ON public.alerts FOR UPDATE USING (true);

-- Table 5: settings
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_tolerance NUMERIC NOT NULL DEFAULT 50,
  validation_frequency TEXT NOT NULL DEFAULT '30min',
  retry_attempts INTEGER NOT NULL DEFAULT 3,
  coupon_validation_enabled BOOLEAN NOT NULL DEFAULT true,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  slack_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert settings" ON public.settings FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.settings (price_tolerance, validation_frequency, retry_attempts, coupon_validation_enabled, email_alerts_enabled, slack_alerts_enabled)
VALUES (50, '30min', 3, true, true, false);
