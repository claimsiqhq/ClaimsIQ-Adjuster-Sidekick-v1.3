-- Run this in your Supabase SQL Editor to create document records
-- Dashboard: https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg/sql

INSERT INTO documents (file_name, storage_path, mime_type, extraction_status)
VALUES 
  ('FNOL 45 TX.pdf', 'FNOL 45 TX.pdf', 'application/pdf', 'pending'),
  ('FNOL 47 MO.pdf', 'FNOL 47 MO.pdf', 'application/pdf', 'pending'),
  ('FNOL 48 TN.pdf', 'FNOL 48 TN.pdf', 'application/pdf', 'pending'),
  ('FNOL 46 TX.pdf', 'FNOL 46 TX.pdf', 'application/pdf', 'pending');

-- Verify the insert
SELECT id, file_name, extraction_status, created_at 
FROM documents 
ORDER BY created_at DESC;

