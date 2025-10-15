-- supabase/schema/routes.sql
-- Routes and stops for daily planning

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== ROUTES TABLE =====
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Route details
  date DATE NOT NULL,
  user_id UUID,
  org_id UUID,
  
  -- Route optimization
  optimized_order TEXT[] NOT NULL, -- Array of claim IDs in route order
  total_distance_km NUMERIC(10,2),
  estimated_duration_minutes INT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Additional data
  metadata JSONB
);

-- ===== STOPS TABLE =====
CREATE TABLE IF NOT EXISTS public.stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Relationships
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.claims(id),
  
  -- Stop details
  stop_order INT NOT NULL,
  address TEXT,
  coordinates JSONB, -- {lat, lng}
  
  -- Timing
  estimated_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  estimated_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  notes TEXT
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS routes_date_idx ON public.routes(date DESC);
CREATE INDEX IF NOT EXISTS routes_user_id_idx ON public.routes(user_id);
CREATE INDEX IF NOT EXISTS routes_status_idx ON public.routes(status);

CREATE INDEX IF NOT EXISTS stops_route_id_idx ON public.stops(route_id);
CREATE INDEX IF NOT EXISTS stops_claim_id_idx ON public.stops(claim_id);
CREATE INDEX IF NOT EXISTS stops_order_idx ON public.stops(route_id, stop_order);

-- ===== TRIGGERS =====
CREATE OR REPLACE FUNCTION public.set_updated_at_routes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  new.updated_at = now(); 
  RETURN new; 
END $$;

DROP TRIGGER IF EXISTS set_updated_at_routes ON public.routes;
CREATE TRIGGER set_updated_at_routes
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_routes();

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage routes
DROP POLICY IF EXISTS routes_all_policy ON public.routes;
CREATE POLICY routes_all_policy
  ON public.routes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS stops_all_policy ON public.stops;
CREATE POLICY stops_all_policy
  ON public.stops FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

