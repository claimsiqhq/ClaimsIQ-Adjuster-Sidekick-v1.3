-- supabase/schema/sla_tracking.sql
-- Add SLA tracking and workflow timing fields for daily optimization

-- ===== CLAIMS TABLE EXTENSIONS =====
-- Add SLA and priority tracking
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS workflow_started_at TIMESTAMPTZ;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100);
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT DEFAULT 60;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS actual_duration_minutes INT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS distance_from_base NUMERIC(10,2); -- In miles/km
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS coordinates JSONB; -- {lat, lng} for mapping

-- Add daily optimization fields
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS visit_order INT; -- Order in daily route
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS weather_risk TEXT; -- low/medium/high
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===== INSPECTION STEPS EXTENSIONS =====
-- Add timing for each workflow step
ALTER TABLE public.inspection_steps ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.inspection_steps ADD COLUMN IF NOT EXISTS estimated_minutes INT DEFAULT 15;
ALTER TABLE public.inspection_steps ADD COLUMN IF NOT EXISTS actual_minutes INT;
ALTER TABLE public.inspection_steps ADD COLUMN IF NOT EXISTS sla_minutes INT; -- Max allowed time for this step
ALTER TABLE public.inspection_steps ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- ===== DAILY OPTIMIZATION TABLE =====
-- Store AI-generated daily plans
CREATE TABLE IF NOT EXISTS public.daily_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  optimization_date DATE NOT NULL,
  
  -- AI generated content
  daily_brief TEXT, -- GPT-4 generated briefing
  optimized_route JSONB, -- Array of claim IDs in optimal order
  time_blocks JSONB, -- Array of time blocks with activities
  weather_windows JSONB, -- Best times for outdoor work
  risk_alerts JSONB, -- Potential issues identified by AI
  recommendations TEXT, -- AI recommendations
  
  -- Metrics
  total_claims INT,
  total_travel_time_minutes INT,
  total_inspection_time_minutes INT,
  efficiency_score INT, -- 0-100
  
  -- Status
  accepted BOOLEAN DEFAULT false,
  modified JSONB, -- Any user modifications to the plan
  
  UNIQUE(user_id, optimization_date)
);

-- ===== SLA CONFIGURATION TABLE =====
-- Store SLA rules by claim type
CREATE TABLE IF NOT EXISTS public.sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  loss_type TEXT NOT NULL,
  priority_level TEXT NOT NULL CHECK (priority_level IN ('urgent', 'high', 'normal', 'low')),
  sla_hours INT NOT NULL, -- Hours from assignment to completion
  
  UNIQUE(loss_type, priority_level)
);

-- Insert default SLA configurations
INSERT INTO public.sla_configs (loss_type, priority_level, sla_hours) VALUES
  ('water', 'urgent', 4),
  ('water', 'high', 24),
  ('water', 'normal', 48),
  ('fire', 'urgent', 2),
  ('fire', 'high', 12),
  ('fire', 'normal', 24),
  ('wind', 'urgent', 24),
  ('wind', 'high', 48),
  ('wind', 'normal', 72),
  ('theft', 'normal', 72),
  ('vandalism', 'normal', 72),
  ('other', 'normal', 96)
ON CONFLICT DO NOTHING;

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS claims_priority_score_idx ON public.claims(priority_score DESC);
CREATE INDEX IF NOT EXISTS claims_sla_deadline_idx ON public.claims(sla_deadline);
CREATE INDEX IF NOT EXISTS claims_scheduled_date_idx ON public.claims(scheduled_date);
CREATE INDEX IF NOT EXISTS claims_coordinates_idx ON public.claims USING GIN(coordinates);
CREATE INDEX IF NOT EXISTS daily_opt_user_date_idx ON public.daily_optimizations(user_id, optimization_date);
CREATE INDEX IF NOT EXISTS inspection_steps_started_at_idx ON public.inspection_steps(started_at);

-- ===== FUNCTIONS =====
-- Calculate SLA deadline when claim is created or updated
CREATE OR REPLACE FUNCTION public.calculate_sla_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  sla_hours INT;
  priority TEXT;
BEGIN
  -- Determine priority based on loss type and other factors
  priority := CASE
    WHEN NEW.loss_type IN ('fire', 'water') AND NEW.estimated_loss > 50000 THEN 'urgent'
    WHEN NEW.loss_type IN ('fire', 'water') AND NEW.estimated_loss > 25000 THEN 'high'
    WHEN NEW.loss_type IN ('fire', 'water') THEN 'normal'
    WHEN NEW.loss_type = 'wind' AND NEW.estimated_loss > 100000 THEN 'high'
    ELSE 'normal'
  END;
  
  -- Get SLA hours from config
  SELECT sc.sla_hours INTO sla_hours
  FROM public.sla_configs sc
  WHERE sc.loss_type = COALESCE(NEW.loss_type, 'other')
    AND sc.priority_level = priority
  LIMIT 1;
  
  -- Set default if not found
  IF sla_hours IS NULL THEN
    sla_hours := 96; -- 4 days default
  END IF;
  
  -- Set the SLA deadline
  NEW.sla_deadline := COALESCE(NEW.workflow_started_at, NEW.created_at) + (sla_hours || ' hours')::INTERVAL;
  
  -- Calculate priority score (0-100, higher is more urgent)
  NEW.priority_score := CASE
    WHEN priority = 'urgent' THEN 90 + LEAST(10, EXTRACT(EPOCH FROM (now() - NEW.created_at))/3600)
    WHEN priority = 'high' THEN 70 + LEAST(20, EXTRACT(EPOCH FROM (now() - NEW.created_at))/3600)
    WHEN priority = 'normal' THEN 40 + LEAST(30, EXTRACT(EPOCH FROM (now() - NEW.created_at))/3600)
    ELSE 20
  END;
  
  RETURN NEW;
END $$;

-- Trigger to auto-calculate SLA on claim changes
DROP TRIGGER IF EXISTS calculate_sla_deadline_trigger ON public.claims;
CREATE TRIGGER calculate_sla_deadline_trigger
  BEFORE INSERT OR UPDATE OF loss_type, estimated_loss, workflow_started_at ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.calculate_sla_deadline();

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.daily_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

-- Daily optimizations policy
DROP POLICY IF EXISTS daily_optimizations_policy ON public.daily_optimizations;
CREATE POLICY daily_optimizations_policy
  ON public.daily_optimizations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SLA configs are read-only for users
DROP POLICY IF EXISTS sla_configs_read_policy ON public.sla_configs;
CREATE POLICY sla_configs_read_policy
  ON public.sla_configs FOR SELECT
  TO authenticated
  USING (true);

-- ===== COMMENTS =====
COMMENT ON COLUMN public.claims.workflow_started_at IS 'When the adjuster started working on this claim';
COMMENT ON COLUMN public.claims.sla_deadline IS 'Deadline for completing the claim based on SLA rules';
COMMENT ON COLUMN public.claims.priority_score IS 'Calculated urgency score 0-100, higher is more urgent';
COMMENT ON COLUMN public.claims.coordinates IS 'GPS coordinates {lat, lng} for mapping and route optimization';
COMMENT ON TABLE public.daily_optimizations IS 'AI-generated daily plans for adjusters';
COMMENT ON TABLE public.sla_configs IS 'SLA rules by claim type and priority level';