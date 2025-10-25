-- supabase/schema/media_rls.sql
-- Row Level Security policies for media table

alter table public.media enable row level security;

-- Allow authenticated users to read media from their org
drop policy if exists media_select_policy on public.media;
create policy media_select_policy
  on public.media for select
  to authenticated
  using (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Allow authenticated users to insert/update/delete media in their org
drop policy if exists media_write_policy on public.media;
create policy media_write_policy
  on public.media for all
  to authenticated
  using (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
  with check (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

