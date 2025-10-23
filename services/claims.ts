import { supabase } from '@/utils/supabase';

export interface Claim {
  id: string;
  created_at: string;
  claim_number: string | null;
  policy_number?: string | null;
  status?: string | null;
  loss_date?: string | null;
  loss_location?: string | null;
  insured_name?: string | null;
  carrier_name?: string | null;
  metadata?: any;
  workflow_metadata?: any;
}

function normalizeClaim(raw: any): Claim {
  if (!raw) {
    return raw;
  }

  const claim: Claim = { ...raw };

  if (typeof claim.metadata === 'string') {
    try {
      claim.metadata = JSON.parse(claim.metadata);
    } catch (error) {
      console.warn('Failed to parse claim.metadata JSON', error);
      claim.metadata = null;
    }
  }

  if (typeof (claim as any).workflow_metadata === 'string') {
    try {
      claim.workflow_metadata = JSON.parse((claim as any).workflow_metadata);
    } catch (error) {
      console.warn('Failed to parse claim.workflow_metadata JSON', error);
      claim.workflow_metadata = null;
    }
  }

  return claim;
}

/**
 * Retrieves an existing claim by its claim number or creates a new one if it doesn't exist.
 * This function uses an 'upsert' operation to ensure that a claim with the given number is unique.
 *
 * @param {string} claim_number - The claim number to search for or create.
 * @returns {Promise<Claim>} A promise that resolves to the claim data.
 * @throws {Error} Throws an error if the Supabase operation fails.
 */
export async function getOrCreateClaimByNumber(claim_number: string): Promise<Claim> {
  const { data, error } = await supabase
    .from('claims')
    .upsert({ claim_number }, { onConflict: 'claim_number' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Claim;
}

/**
 * Searches for claims with a claim number similar to the provided query.
 * This is useful for implementing search functionality where users can type a partial claim number.
 *
 * @param {string} query - The partial or full claim number to search for.
 * @param {number} [limit=20] - The maximum number of claims to return.
 * @returns {Promise<Claim[]>} A promise that resolves to an array of matching claims.
 * @throws {Error} Throws an error if the Supabase operation fails.
 */
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

/**
 * Retrieves a list of claims associated with a specific user.
 * It gracefully handles row-level security (RLS) errors by returning an empty array if access is denied.
 *
 * @param {string} userId - The unique identifier of the user whose claims are to be retrieved.
 * @returns {Promise<Claim[]>} A promise that resolves to an array of claims.
 * @throws {Error} Throws an error for failures other than RLS policy violations.
 */
export async function getClaims(userId: string): Promise<Claim[]> {
  let query = supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getClaims error:', error);
    // Return empty array instead of throwing if it's an RLS error
    if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
      console.warn('RLS policy blocking claims access for user:', userId);
      return [];
    }
    throw error;
  }

  return (data ?? []).map(normalizeClaim);
}

/**
 * Retrieves a single claim by its unique identifier.
 *
 * @param {string} id - The unique identifier of the claim.
 * @returns {Promise<Claim | null>} A promise that resolves to the claim data, or null if not found or an error occurs.
 */
export async function getClaimById(id: string): Promise<Claim | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return normalizeClaim(data);
}
