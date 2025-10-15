-- supabase/schema/documents.sql
-- Documents table for PDFs, FNOLs, estimates, reports

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== TABLES =====
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Relationships
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id UUID,
  org_id UUID,
  
  -- Document metadata
  document_type TEXT NOT NULL CHECK (document_type IN ('fnol', 'estimate', 'photo', 'report', 'invoice', 'correspondence', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  
  -- For FNOL documents, store extracted JSON
  extracted_data JSONB,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'error')),
  extraction_error TEXT,
  extraction_confidence NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Additional metadata
  tags TEXT[],
  metadata JSONB
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS documents_claim_id_idx ON public.documents(claim_id);
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS documents_org_id_idx ON public.documents(org_id);
CREATE INDEX IF NOT EXISTS documents_document_type_idx ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS documents_extraction_status_idx ON public.documents(extraction_status);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents(created_at DESC);

-- ===== TRIGGERS =====
CREATE OR REPLACE FUNCTION public.set_updated_at_documents()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  new.updated_at = now(); 
  RETURN new; 
END $$;

DROP TRIGGER IF EXISTS set_updated_at_documents ON public.documents;
CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_documents();

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read documents
DROP POLICY IF EXISTS documents_select_policy ON public.documents;
CREATE POLICY documents_select_policy
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete documents
DROP POLICY IF EXISTS documents_write_policy ON public.documents;
CREATE POLICY documents_write_policy
  ON public.documents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

