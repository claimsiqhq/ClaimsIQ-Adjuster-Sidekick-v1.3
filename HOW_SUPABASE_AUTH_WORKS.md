# 🔐 How Supabase Authentication Actually Works

## IMPORTANT: There's NO Password Column in Profiles!

**This is CORRECT and by design!** Here's why:

### Supabase Has TWO Separate Systems:

#### 1. `auth.users` Table (Managed by Supabase)
- ✅ Stores email, hashed password, confirmation status
- ✅ Managed entirely by Supabase Auth service
- ✅ You NEVER directly insert into this table
- ✅ Passwords are securely hashed by Supabase

#### 2. `public.profiles` Table (Your Custom Data)
- ✅ Stores display_name, is_admin, metadata
- ✅ Does NOT store passwords (security!)
- ✅ Links to auth.users via id (foreign key)
- ✅ You insert additional user data here

## 🔄 How Signup Works

### Step 1: Create Auth User
```javascript
await supabase.auth.signUp({ email, password })
```
This creates a row in `auth.users` with:
- id (UUID)
- email
- encrypted_password (hashed)
- email_confirmed_at
- etc.

### Step 2: Create Profile
```javascript
await supabase.from('profiles').insert({
  id: authUser.id,  // Same ID as auth.users
  email: email,
  display_name: 'Name',
  is_admin: false
})
```

This creates a row in `public.profiles` with user metadata.

## 📊 Current Schema (From Your Earlier Message)

```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL,  -- Links to auth.users(id)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL,
  display_name text,
  is_admin boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

**No password column!** Passwords are in `auth.users` (managed by Supabase).

## 🎯 What's Actually Happening

When you call `signUpAdmin()` in the app:

1. ✅ `supabase.auth.signUp()` creates user in `auth.users`
2. ❌ RLS blocks inserting into `profiles` table
3. ❌ You get "violates row-level security policy"

## 🔧 The Fix

The RLS policy needs to allow authenticated users to insert their profile. I already fixed this, but you might need to check if it applied correctly.

## 🚨 The Real Problem

You're getting the RLS error because:
1. User gets created in `auth.users` ✅
2. User is authenticated ✅
3. App tries to insert into `profiles` ❌ (RLS blocks it)

The fix I applied should allow this. Let me verify it worked...

