-- supabase/schema/media.sql
-- Media table for photos, LiDAR scans, and other media assets

create extension if not exists pgcrypto;

-- ===== TABLES =====
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ownership/Organization
  user_id uuid null,
  org_id uuid null,
  claim_id uuid null,
  
  -- Media type and status
  type text not null check (type in ('photo', 'lidar_room')),
  status text not null default 'pending' check (status in ('pending', 'uploading', 'uploaded', 'annotating', 'done', 'error')),
  
  -- Core fields
  label text null,
  storage_path text null,
  anno_count int null default 0,
  
  -- JSON fields
  qc jsonb null,                -- PhotoQC: blur_score, glare, underexposed, distance_hint_m
  annotation_json jsonb null,   -- AnnotationJSON: detections[], photo_qc, model
  redaction_json jsonb null,    -- Redaction data
  derived jsonb null,           -- Derived/computed data
  
  -- Error tracking
  last_error text null
);

-- ===== INDEXES =====
create index if not exists media_user_id_idx on public.media(user_id);
create index if not exists media_org_id_idx on public.media(org_id);
create index if not exists media_claim_id_idx on public.media(claim_id);
create index if not exists media_type_idx on public.media(type);
create index if not exists media_status_idx on public.media(status);
create index if not exists media_created_at_idx on public.media(created_at desc);

-- ===== TRIGGERS =====
create or replace function public.set_updated_at_media()
returns trigger language plpgsql as $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;

drop trigger if exists set_updated_at_media on public.media;
create trigger set_updated_at_media
  before update on public.media
  for each row execute function public.set_updated_at_media();

-- Note: RLS policies are in media_rls.sql

