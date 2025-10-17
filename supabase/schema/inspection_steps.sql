-- supabase/schema/inspection_steps.sql
-- Workflow inspection steps for claims

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== INSPECTION STEPS TABLE =====
CREATE TABLE IF NOT EXISTS public.inspection_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Relationships
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  org_id UUID,
  
  -- Step details
  step_order INT NOT NULL,
  orig_id TEXT, -- Original ID from AI-generated workflow
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'scan', 'doc', 'note', 'measure')),
  instructions TEXT,
  
  -- Evidence requirements and validation
  evidence_rules JSONB, -- { min_count, must_tags, gps_required, etc. }
  validation JSONB,
  next_steps TEXT[], -- IDs of subsequent steps if branching
  
  -- Completion tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  
  -- Additional metadata
  metadata JSONB
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS inspection_steps_claim_id_idx ON public.inspection_steps(claim_id);
CREATE INDEX IF NOT EXISTS inspection_steps_status_idx ON public.inspection_steps(status);
CREATE INDEX IF NOT EXISTS inspection_steps_order_idx ON public.inspection_steps(claim_id, step_order);

-- ===== TRIGGERS =====
CREATE OR REPLACE FUNCTION public.set_updated_at_inspection_steps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$;

DROP TRIGGER IF EXISTS set_updated_at_inspection_steps ON public.inspection_steps;
CREATE TRIGGER set_updated_at_inspection_steps
  BEFORE UPDATE ON public.inspection_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_inspection_steps();

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.inspection_steps ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage inspection steps
DROP POLICY IF EXISTS inspection_steps_all_policy ON public.inspection_steps;
CREATE POLICY inspection_steps_all_policy
  ON public.inspection_steps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
