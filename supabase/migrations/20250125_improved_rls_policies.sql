-- Improved Row-Level Security (RLS) Policies for ClaimsIQ
-- This migration tightens security by implementing org-level isolation
-- and proper access controls for multi-tenant data

-- ============================================================================
-- CLAIMS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own claims" ON claims;
DROP POLICY IF EXISTS "Users can insert own claims" ON claims;
DROP POLICY IF EXISTS "Users can update own claims" ON claims;
DROP POLICY IF EXISTS "Users can delete own claims" ON claims;

-- Enable RLS on claims table
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view claims in their organization
CREATE POLICY "Users can view org claims"
  ON claims
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    org_id IN (
      SELECT org_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert claims to their organization
CREATE POLICY "Users can insert org claims"
  ON claims
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    (
      org_id IS NULL
      OR
      org_id IN (
        SELECT org_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own claims or org claims (if admin)
CREATE POLICY "Users can update org claims"
  ON claims
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    (
      org_id IN (
        SELECT org_id
        FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (
      org_id IN (
        SELECT org_id
        FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
      )
    )
  );

-- Policy: Only admins can delete claims
CREATE POLICY "Admins can delete org claims"
  ON claims
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id
      FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- MEDIA TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own media" ON media;
DROP POLICY IF EXISTS "Users can insert own media" ON media;
DROP POLICY IF EXISTS "Users can update own media" ON media;
DROP POLICY IF EXISTS "Users can delete own media" ON media;

-- Enable RLS on media table
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view media in their organization
CREATE POLICY "Users can view org media"
  ON media
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    org_id IN (
      SELECT org_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert media to their organization
CREATE POLICY "Users can insert org media"
  ON media
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    (
      org_id IS NULL
      OR
      org_id IN (
        SELECT org_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own media
CREATE POLICY "Users can update own media"
  ON media
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete own media"
  ON media
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents in their organization
CREATE POLICY "Users can view org documents"
  ON documents
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    org_id IN (
      SELECT org_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert documents to their organization
CREATE POLICY "Users can insert org documents"
  ON documents
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    (
      org_id IS NULL
      OR
      org_id IN (
        SELECT org_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WORKFLOWS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can insert own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can update own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete own workflows" ON workflows;

-- Enable RLS on workflows table
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view workflows in their organization
CREATE POLICY "Users can view org workflows"
  ON workflows
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    org_id IN (
      SELECT org_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert workflows to their organization
CREATE POLICY "Users can insert org workflows"
  ON workflows
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    (
      org_id IS NULL
      OR
      org_id IN (
        SELECT org_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own workflows
CREATE POLICY "Users can update own workflows"
  ON workflows
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own workflows
CREATE POLICY "Users can delete own workflows"
  ON workflows
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================

-- Media bucket policies
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete media" ON storage.objects;

-- Policy: Authenticated users can upload to media bucket
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Policy: Authenticated users can view media
CREATE POLICY "Authenticated users can view media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'media');

-- Policy: Users can update their own media files
CREATE POLICY "Users can update own media files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own media files
CREATE POLICY "Users can delete own media files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND org_id = check_org_id
    AND role = 'admin'
  );
$$;

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION is_org_member(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND org_id = check_org_id
  );
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on user_id for faster policy checks
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_org_id ON claims(org_id);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_org_id ON media(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org_id ON workflows(org_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_claims_user_created ON claims(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_claim_created ON media(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_user_type ON media(user_id, type, created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view org claims" ON claims IS
  'Users can view their own claims and claims from their organization';

COMMENT ON POLICY "Users can view org media" ON media IS
  'Users can view their own media and media from their organization';

COMMENT ON FUNCTION is_org_admin IS
  'Check if the current user is an admin of the specified organization';

COMMENT ON FUNCTION is_org_member IS
  'Check if the current user is a member of the specified organization';
