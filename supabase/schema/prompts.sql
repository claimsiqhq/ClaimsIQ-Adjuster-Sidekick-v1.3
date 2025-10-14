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
