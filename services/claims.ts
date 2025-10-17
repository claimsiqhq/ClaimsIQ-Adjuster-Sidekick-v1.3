import { supabase } from '@/utils/supabase';

export interface Claim {
  id: string;
  created_at: string;
  claim_number: string | null;
}

export async function getOrCreateClaimByNumber(claim_number: string): Promise<Claim> {
  const { data, error } = await supabase
    .from('claims')
    .upsert({ claim_number }, { onConflict: 'claim_number' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Claim;
}

export async function listClaimsLike(query: string, limit = 20): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .ilike('claim_number', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Claim[];
}

export async function getClaims(userId: string): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Claim[];
}

export async function getClaimById(id: string): Promise<Claim | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Claim;
}
