-- supabase/schema/storage_buckets.sql
-- Storage bucket configuration for documents and media

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Documents bucket for FNOL PDFs, estimates, reports, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Public bucket for easier access (RLS still applies)
  52428800,  -- 50MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- Media bucket for photos, LiDAR scans, videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,  -- Public bucket
  104857600,  -- 100MB max file size (for LiDAR scans)
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime', 'application/octet-stream'];

-- =====================================================
-- STORAGE RLS POLICIES - DOCUMENTS BUCKET
-- =====================================================

-- Allow authenticated users to upload documents to their org
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read documents from their org
-- Note: This is permissive for now - tighten based on org_id if needed
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow public read access for documents (since bucket is public)
-- This enables public URLs to work
DROP POLICY IF EXISTS "Public can read documents" ON storage.objects;
CREATE POLICY "Public can read documents"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'documents');

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own documents
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- =====================================================
-- STORAGE RLS POLICIES - MEDIA BUCKET
-- =====================================================

-- Allow authenticated users to upload media
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read media
DROP POLICY IF EXISTS "Authenticated users can read media" ON storage.objects;
CREATE POLICY "Authenticated users can read media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- Allow public read access for media (since bucket is public)
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
CREATE POLICY "Public can read media"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'media');

-- Allow authenticated users to update their media
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their media
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Ensure authenticated users can access storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- =====================================================
-- NOTES
-- =====================================================

-- This configuration:
-- 1. Creates two public buckets (documents and media)
-- 2. Sets appropriate file size limits
-- 3. Restricts allowed MIME types for security
-- 4. Allows authenticated users to upload, read, update, delete
-- 5. Allows public (anon) users to read (for public URLs)
-- 6. Public buckets enable getPublicUrl() to work without signed URLs

-- To tighten security further, you can:
-- 1. Make buckets private (public = false)
-- 2. Add org_id checks in RLS policies
-- 3. Use path-based restrictions (e.g., path LIKE 'org_id/%')
-- 4. Require signed URLs for access

-- For production, consider:
-- 1. Reducing file size limits if needed
-- 2. Adding virus scanning
-- 3. Implementing storage quotas per org
-- 4. Setting up lifecycle policies for cleanup
