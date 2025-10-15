-- supabase/schema/COMPLIANCE_FIXES.sql
-- SQL to fix schema compliance issues
-- Run this in Supabase SQL Editor

-- =====================================================
-- FIX 1: Add missing updated_at column to media table
-- =====================================================

ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- =====================================================
-- FIX 2: Add missing derived column to media table
-- =====================================================

ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS derived JSONB;

COMMENT ON COLUMN public.media.derived IS 'Derived/computed data from analysis';

-- =====================================================
-- FIX 3: Add update trigger for media table
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at_media()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$;

DROP TRIGGER IF EXISTS set_updated_at_media ON public.media;
CREATE TRIGGER set_updated_at_media
  BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_media();

-- =====================================================
-- FIX 4: Fix array types in documents table
-- =====================================================

-- Drop and recreate with proper type
ALTER TABLE public.documents 
DROP COLUMN IF EXISTS tags;

ALTER TABLE public.documents 
ADD COLUMN tags TEXT[];

-- =====================================================
-- FIX 5: Fix array type in routes table
-- =====================================================

-- Note: This might fail if data exists, backup first
DO $$
BEGIN
  -- Try to alter column type
  ALTER TABLE public.routes ALTER COLUMN optimized_order TYPE TEXT[];
EXCEPTION
  WHEN others THEN
    -- If it fails, create new column and migrate data
    ALTER TABLE public.routes ADD COLUMN optimized_order_new TEXT[];
    UPDATE public.routes SET optimized_order_new = optimized_order::TEXT[];
    ALTER TABLE public.routes DROP COLUMN optimized_order;
    ALTER TABLE public.routes RENAME COLUMN optimized_order_new TO optimized_order;
    ALTER TABLE public.routes ALTER COLUMN optimized_order SET NOT NULL;
END $$;

-- =====================================================
-- FIX 6: Add precision to extraction_confidence
-- =====================================================

ALTER TABLE public.documents 
ALTER COLUMN extraction_confidence TYPE NUMERIC(3,2);

-- =====================================================
-- FIX 7: Update documents foreign key to CASCADE
-- =====================================================

-- Drop existing constraint
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_claim_id_fkey;

-- Add with CASCADE
ALTER TABLE public.documents 
ADD CONSTRAINT documents_claim_id_fkey 
FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE;

-- =====================================================
-- FIX 8: Update media foreign key to SET NULL
-- =====================================================

-- Drop existing constraint
ALTER TABLE public.media 
DROP CONSTRAINT IF EXISTS media_claim_id_fkey;

-- Add with SET NULL (keep media even if claim deleted)
ALTER TABLE public.media 
ADD CONSTRAINT media_claim_id_fkey 
FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE SET NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check media table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'media' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check documents table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'documents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('media', 'documents');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ All schema compliance fixes applied successfully!';
  RAISE NOTICE '   - Added media.updated_at column';
  RAISE NOTICE '   - Added media.derived column';
  RAISE NOTICE '   - Added media update trigger';
  RAISE NOTICE '   - Fixed documents.tags array type';
  RAISE NOTICE '   - Fixed routes.optimized_order array type';
  RAISE NOTICE '   - Fixed extraction_confidence precision';
  RAISE NOTICE '   - Updated foreign key constraints';
END $$;

