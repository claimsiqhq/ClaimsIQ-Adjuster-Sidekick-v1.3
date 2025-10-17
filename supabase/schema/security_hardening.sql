-- supabase/schema/security_hardening.sql
-- Tighten RLS policies for multi-tenant security

-- =====================================================
-- DOCUMENTS TABLE - Restrict to org
-- =====================================================

DROP POLICY IF EXISTS documents_select_policy ON public.documents;
DROP POLICY IF EXISTS documents_write_policy ON public.documents;

-- Only read documents from your org (or all if org_id is null for now)
CREATE POLICY documents_select_policy
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL OR 
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Only write documents to your org
CREATE POLICY documents_write_policy
  ON public.documents FOR ALL
  TO authenticated
  USING (
    org_id IS NULL OR 
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    org_id IS NULL OR 
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- =====================================================
-- INSPECTION_STEPS TABLE - Restrict via claim ownership
-- =====================================================

DROP POLICY IF EXISTS inspection_steps_select_policy ON public.inspection_steps;
DROP POLICY IF EXISTS inspection_steps_write_policy ON public.inspection_steps;

-- Can only see steps for claims in your org
CREATE POLICY inspection_steps_select_policy
  ON public.inspection_steps FOR SELECT
  TO authenticated
  USING (
    claim_id IN (
      SELECT id FROM public.claims 
      WHERE org_id IS NULL OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Can only modify steps for claims in your org
CREATE POLICY inspection_steps_write_policy
  ON public.inspection_steps FOR ALL
  TO authenticated
  USING (
    claim_id IN (
      SELECT id FROM public.claims 
      WHERE org_id IS NULL OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    claim_id IN (
      SELECT id FROM public.claims 
      WHERE org_id IS NULL OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- ROUTES TABLE - Restrict to user/org
-- =====================================================

DROP POLICY IF EXISTS routes_all_policy ON public.routes;

CREATE POLICY routes_select_policy
  ON public.routes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY routes_write_policy
  ON public.routes FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STOPS TABLE - Restrict via route ownership
-- =====================================================

DROP POLICY IF EXISTS stops_all_policy ON public.stops;

CREATE POLICY stops_select_policy
  ON public.stops FOR SELECT
  TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes 
      WHERE user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY stops_write_policy
  ON public.stops FOR ALL
  TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes 
      WHERE user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    route_id IN (
      SELECT id FROM public.routes 
      WHERE user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- Add org_id helper function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT org_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

COMMENT ON FUNCTION public.get_user_org_id() IS 'Helper to get current user org_id for RLS policies';

