import { supabase } from '@/utils/supabase';

export interface Claim {
  id: string;
  created_at: string;
  claim_number: string | null;
  policy_number?: string | null;
  status?: string | null;
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
    .eq('user_id', userId)  // Actually filter by user_id now
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('getClaims error:', error);
    // Return empty array instead of throwing if it's an RLS error
    if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
      console.warn('RLS policy blocking claims access for user:', userId);
      return [];
    }
    throw error;
  }
  
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
