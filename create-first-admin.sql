-- Create first admin user manually
-- Run this in Supabase SQL Editor if signup still doesn't work

-- First, create the auth user (replace with your email/password)
-- Go to: https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg/auth/users
-- Click "Add user" -> "Create new user"
-- Email: john.shoust@pm.me
-- Password: admin123
-- Toggle "Auto Confirm User" to ON
-- Click "Create user"

-- Then run this SQL to create the profile:
INSERT INTO public.profiles (id, email, display_name, is_admin, created_at, updated_at)
SELECT 
  id,
  email,
  'Admin User',
  true,
  now(),
  now()
FROM auth.users 
WHERE email = 'john.shoust@pm.me'
ON CONFLICT (id) DO UPDATE 
SET is_admin = true, display_name = 'Admin User';

-- Verify it worked:
SELECT p.email, p.is_admin, p.created_at
FROM public.profiles p
WHERE p.email = 'john.shoust@pm.me';

