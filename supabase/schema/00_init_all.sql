-- supabase/schema/00_init_all.sql
-- Master initialization script for Claims iQ Sidekick
-- Run all schemas in the correct order

\echo 'Starting Claims iQ Sidekick database initialization...'

-- 1. Create profiles table
\echo '1/5: Creating profiles table...'
\i supabase/schema/profiles.sql

-- 2. Create claims table
\echo '2/5: Creating claims table...'
\i supabase/schema/claims.sql

-- 3. Create media table
\echo '3/5: Creating media table...'
\i supabase/schema/media.sql

-- 4. Apply media RLS policies
\echo '4/5: Applying media RLS policies...'
\i supabase/schema/media_rls.sql

-- 5. Create app_prompts table and seed
\echo '5/5: Creating app_prompts table and seeding...'
\i supabase/schema/prompts.sql

\echo 'Database initialization complete!'

