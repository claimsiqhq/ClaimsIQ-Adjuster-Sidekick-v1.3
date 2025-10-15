-- Combined migration for Claims iQ Sidekick
-- Generated: 2025-10-15T14:08:08.639Z


-- ================================================
-- supabase/schema/profiles.sql
-- ================================================

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



-- ================================================
-- supabase/schema/claims.sql
-- ================================================

-- supabase/schema/claims.sql
-- Claims table for insurance claim tracking

create extension if not exists pgcrypto;

-- ===== TABLES =====
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Core fields
  claim_number text not null unique,
  
  -- Optional metadata (can be expanded as needed)
  org_id uuid null,
  user_id uuid null,
  insured_name text null,
  insured_phone text null,
  insured_email text null,
  loss_date timestamptz null,
  reported_date timestamptz null,
  loss_type text null,
  status text null default 'open' check (status in ('open', 'in_progress', 'completed', 'closed')),
  
  -- Address
  property_address jsonb null,
  
  -- Additional data
  metadata jsonb null
);

-- ===== INDEXES =====
create index if not exists claims_claim_number_idx on public.claims(claim_number);
create index if not exists claims_org_id_idx on public.claims(org_id);
create index if not exists claims_user_id_idx on public.claims(user_id);
create index if not exists claims_created_at_idx on public.claims(created_at desc);

-- ===== TRIGGERS =====
create or replace function public.set_updated_at_claims()
returns trigger language plpgsql as $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;

drop trigger if exists set_updated_at_claims on public.claims;
create trigger set_updated_at_claims
  before update on public.claims
  for each row execute function public.set_updated_at_claims();

-- ===== ROW LEVEL SECURITY =====
alter table public.claims enable row level security;

-- Allow anon and authenticated users to read claims (adjust as needed)
drop policy if exists claims_select_policy on public.claims;
create policy claims_select_policy
  on public.claims for select
  to anon, authenticated
  using (true);

-- Allow authenticated users to insert/update claims
drop policy if exists claims_write_policy on public.claims;
create policy claims_write_policy
  on public.claims for all
  to authenticated
  using (true)
  with check (true);

-- ===== FOREIGN KEY for media table =====
-- Add foreign key constraint to media.claim_id if not exists
do $$ 
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'media_claim_id_fkey' 
    and table_name = 'media'
  ) then
    alter table public.media
      add constraint media_claim_id_fkey 
      foreign key (claim_id) references public.claims(id) on delete set null;
  end if;
end $$;



-- ================================================
-- supabase/schema/media.sql
-- ================================================

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



-- ================================================
-- supabase/schema/media_rls.sql
-- ================================================

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



-- ================================================
-- supabase/schema/prompts.sql
-- ================================================

-- supabase/schema/prompts.sql

create extension if not exists pgcrypto;

-- ===== TABLES =====
create table if not exists public.app_prompts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  org_id uuid null,
  key text not null,              -- e.g., 'fnol_extract_system', 'vision_annotate_user', 'workflow_generate_system'
  role text not null check (role in ('system','user','tool')),
  description text null,
  template text not null,         -- the prompt body
  is_active boolean not null default true
);

create unique index if not exists app_prompts_key_active_idx
  on public.app_prompts(key) where is_active = true;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists set_updated_at_app_prompts on public.app_prompts;
create trigger set_updated_at_app_prompts
before update on public.app_prompts
for each row execute function public.set_updated_at();

alter table public.app_prompts enable row level security;

-- RLS: open select for now (tighten later)
drop policy if exists app_prompts_select_public on public.app_prompts;
create policy app_prompts_select_public
on public.app_prompts for select
to anon, authenticated
using (true);

-- RLS: allow insert/update only to authenticated (can tighten to roles later)
drop policy if exists app_prompts_write_auth on public.app_prompts;
create policy app_prompts_write_auth
on public.app_prompts for all
to authenticated
using (true)
with check (true);

-- ===== SEED KEYS (deactivate previous actives then insert defaults if none) =====
update public.app_prompts set is_active = false, updated_at = now()
where key in (
  'fnol_extract_system','fnol_extract_user',
  'vision_annotate_system','vision_annotate_user',
  'workflow_generate_system','workflow_generate_user'
) and is_active = true;

-- Only insert if no active row exists for key
insert into public.app_prompts (key, role, description, template, is_active)
select 'fnol_extract_system','system','System prompt for FNOL PDF → JSON extraction', 
'You convert insurance FNOL documents (PDF images) into STRICT JSON fields for claims intake. 
Return ONLY JSON with fields: claim_number, loss_date, reported_date, loss_type, peril_details, insured{name,phone,email}, 
policy{number,deductible,coverages[]}, property{address{line1,city,state,postal}, geocode{lat,lng}}, contacts[], 
flags{emergency_services:boolean,hazards[]}, attachments[], issues[{field, severity, note}], confidence{* per extracted field}.', true
where not exists (select 1 from public.app_prompts where key='fnol_extract_system' and is_active=true);

insert into public.app_prompts (key, role, description, template, is_active)
select 'fnol_extract_user','user','User prompt for FNOL PDF → JSON extraction', 
'Extract all visible fields from the supplied page images. If a field is missing or unclear, add an issue with severity "missing" or "low_confidence".
Image pages: {{IMAGE_URLS}}', true
where not exists (select 1 from public.app_prompts where key='fnol_extract_user' and is_active=true);

insert into public.app_prompts (key, role, description, template, is_active)
select 'vision_annotate_system','system','System prompt for photo auto-annotation', 
'You are a senior property damage assessor. Return STRICT JSON:
{"detections":[{"id":"...","label":"...","friendly":"...","severity":"minor|moderate|severe|uncertain","confidence":0.0,"evidence":"...","tags":["..."],"shape":{"type":"bbox","box":{"x":0..1,"y":0..1,"w":0..1,"h":0..1}}}],"photo_qc":{"blur_score":0..1,"glare":bool,"underexposed":bool,"distance_hint_m":number},"model":{"name":"<string>","ts":"<iso8601>"}} 
Rules: coords are RELATIVE 0..1; prefer few precise detections; JSON ONLY.', true
where not exists (select 1 from public.app_prompts where key='vision_annotate_system' and is_active=true);

insert into public.app_prompts (key, role, description, template, is_active)
select 'vision_annotate_user','user','User prompt for photo auto-annotation', 
'Task: Detect damage/issues/safety concerns. Scene tags: {{SCENE_TAGS}}. Image: {{IMAGE_URL}}.
Consider hail dents, granule loss, shingle tears, water stains, microbial growth suspect, gutter/fascia damage, broken glazing, fence damage.
Mark uncertain with confidence < 0.5. JSON only.', true
where not exists (select 1 from public.app_prompts where key='vision_annotate_user' and is_active=true);

insert into public.app_prompts (key, role, description, template, is_active)
select 'workflow_generate_system','system','System prompt for dynamic workflow generation', 
'You produce an efficient, stepwise inspection workflow as JSON array of steps with fields:
{id,title,kind: "photo|scan|doc|note|measure", instructions[], evidence_rules{min_count, must_tags[], gps_required}, validation{...}, next[] }.
Balance completeness with site efficiency. Respect safety and access constraints. JSON ONLY.', true
where not exists (select 1 from public.app_prompts where key='workflow_generate_system' and is_active=true);

insert into public.app_prompts (key, role, description, template, is_active)
select 'workflow_generate_user','user','User prompt for dynamic workflow generation', 
'Generate steps for loss_type: {{LOSS_TYPE}}, dwelling: {{DWELLING}}, jurisdiction: {{JURISDICTION}}, notes: {{NOTES}}.
Prioritize steps that improve estimate accuracy and downstream QA checks. JSON only.', true
where not exists (select 1 from public.app_prompts where key='workflow_generate_user' and is_active=true);

