-- supabase/schema/profiles.sql
-- User profiles table

create extension if not exists pgcrypto;

-- ===== TABLES =====
create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Core fields
  email text not null unique,
  display_name text null,
  is_admin boolean not null default false,
  
  -- Additional metadata
  metadata jsonb null
);

-- ===== INDEXES =====
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_is_admin_idx on public.profiles(is_admin);

-- ===== TRIGGERS =====
create or replace function public.set_updated_at_profiles()
returns trigger language plpgsql as $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at_profiles();

-- ===== ROW LEVEL SECURITY =====
alter table public.profiles enable row level security;

-- Allow users to read all profiles
drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Allow authenticated users to update their own profile
drop policy if exists profiles_update_own_policy on public.profiles;
create policy profiles_update_own_policy
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Allow authenticated users to insert their own profile
drop policy if exists profiles_insert_own_policy on public.profiles;
create policy profiles_insert_own_policy
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Allow admins to do anything
drop policy if exists profiles_admin_all_policy on public.profiles;
create policy profiles_admin_all_policy
  on public.profiles for all
  to authenticated
  using (exists (
    select 1 from public.profiles 
    where id = auth.uid() and is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles 
    where id = auth.uid() and is_admin = true
  ));

