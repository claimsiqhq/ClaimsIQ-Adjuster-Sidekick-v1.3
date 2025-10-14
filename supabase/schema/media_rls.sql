-- supabase/schema/media_rls.sql
-- Row Level Security policies for media table

alter table public.media enable row level security;

-- Allow anon and authenticated users to read media (adjust as needed for org/user filtering)
drop policy if exists media_select_policy on public.media;
create policy media_select_policy
  on public.media for select
  to anon, authenticated
  using (true);

-- Allow authenticated users to insert/update/delete media
drop policy if exists media_write_policy on public.media;
create policy media_write_policy
  on public.media for all
  to authenticated
  using (true)
  with check (true);

-- Future: Add org-specific or user-specific policies
-- Example for org isolation:
-- create policy media_org_select_policy
--   on public.media for select
--   to authenticated
--   using (org_id = (select org_id from public.profiles where id = auth.uid()));

