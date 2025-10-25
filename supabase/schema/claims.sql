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

-- Allow authenticated users to read claims from their org
drop policy if exists claims_select_policy on public.claims;
create policy claims_select_policy
  on public.claims for select
  to authenticated
  using (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Allow authenticated users to insert/update claims in their org
drop policy if exists claims_write_policy on public.claims;
create policy claims_write_policy
  on public.claims for all
  to authenticated
  using (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
  with check (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

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

