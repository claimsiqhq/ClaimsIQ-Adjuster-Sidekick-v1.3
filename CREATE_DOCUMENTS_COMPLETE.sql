-- Run this in your Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg/sql/new

INSERT INTO documents (
  claim_id,
  user_id,
  org_id,
  document_type,
  file_name,
  storage_path,
  mime_type,
  file_size_bytes,
  extracted_data,
  extraction_status,
  extraction_error,
  extraction_confidence,
  tags,
  metadata
)
VALUES 
  (NULL, NULL, NULL, 'fnol', 'FNOL 45 TX.pdf', 'FNOL 45 TX.pdf', 'application/pdf', 52631, NULL, 'pending', NULL, NULL, ARRAY['fnol', 'texas'], '{"state": "TX", "form_number": "45"}'::jsonb),
  (NULL, NULL, NULL, 'fnol', 'FNOL 47 MO.pdf', 'FNOL 47 MO.pdf', 'application/pdf', 54269, NULL, 'pending', NULL, NULL, ARRAY['fnol', 'missouri'], '{"state": "MO", "form_number": "47"}'::jsonb),
  (NULL, NULL, NULL, 'fnol', 'FNOL 48 TN.pdf', 'FNOL 48 TN.pdf', 'application/pdf', 53787, NULL, 'pending', NULL, NULL, ARRAY['fnol', 'tennessee'], '{"state": "TN", "form_number": "48"}'::jsonb),
  (NULL, NULL, NULL, 'fnol', 'FNOL 46 TX.pdf', 'FNOL 46 TX.pdf', 'application/pdf', 54475, NULL, 'pending', NULL, NULL, ARRAY['fnol', 'texas'], '{"state": "TX", "form_number": "46"}'::jsonb);

-- Return the created records with their IDs
SELECT 
  id, 
  file_name, 
  document_type,
  file_size_bytes,
  extraction_status, 
  created_at 
FROM documents 
WHERE file_name LIKE 'FNOL%'
ORDER BY created_at DESC;

