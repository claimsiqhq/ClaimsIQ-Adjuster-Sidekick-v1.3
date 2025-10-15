-- supabase/schema/claims_extended.sql
-- Extend claims table for FNOL data

-- Add FNOL-specific columns for frequently queried fields
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS policy_number TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS carrier_name TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS adjuster_name TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS adjuster_email TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS adjuster_phone TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS loss_location TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS loss_description TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS cause_of_loss TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS estimated_loss NUMERIC(12,2);
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS time_of_loss TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS date_prepared TIMESTAMPTZ;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS reporter_phone TEXT;

-- The complete FNOL JSON is stored in metadata column for full fidelity
-- Indexes for new searchable fields
CREATE INDEX IF NOT EXISTS claims_policy_number_idx ON public.claims(policy_number);
CREATE INDEX IF NOT EXISTS claims_carrier_name_idx ON public.claims(carrier_name);
CREATE INDEX IF NOT EXISTS claims_adjuster_email_idx ON public.claims(adjuster_email);
CREATE INDEX IF NOT EXISTS claims_loss_location_idx ON public.claims(loss_location);

COMMENT ON COLUMN public.claims.metadata IS 'Stores complete FNOL JSON and other metadata';
COMMENT ON COLUMN public.claims.policy_number IS 'Extracted from FNOL for quick querying';
COMMENT ON COLUMN public.claims.carrier_name IS 'Insurance carrier name';
COMMENT ON COLUMN public.claims.adjuster_email IS 'Assigned adjuster email for notifications';

