import { supabase } from '@/utils/supabase';

export interface Claim {
  id: string;
  created_at: string;
  updated_at: string;
  claim_number: string | null;
  org_id: string | null;
  user_id: string | null;
  insured_name: string | null;
  insured_phone: string | null;
  insured_email: string | null;
  loss_date: string | null;
  reported_date: string | null;
  loss_type: string | null;
  status: string | null;
  property_address: any;
  metadata: any;
  policy_number: string | null;
  carrier_name: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  loss_location: string | null;
  loss_description: string | null;
  cause_of_loss: string | null;
  estimated_loss: number | null;
  time_of_loss: string | null;
  date_prepared: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
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
 * Retrieves a list of claims associated with a specific user with pagination support.
 * It gracefully handles row-level security (RLS) errors by returning an empty array if access is denied.
 *
 * @param {string} userId - The unique identifier of the user whose claims are to be retrieved.
 * @param {number} [limit=50] - The maximum number of claims to return.
 * @param {number} [offset=0] - The number of claims to skip for pagination.
 * @returns {Promise<Claim[]>} A promise that resolves to an array of claims.
 * @throws {Error} Throws an error for failures other than RLS policy violations.
 */
export async function getClaims(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Claim[]> {
  let query = supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

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
 * Gets the total count of claims for a user.
 *
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<number>} A promise that resolves to the total count.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function getClaimsCount(userId: string): Promise<number> {
  let query = supabase
    .from('claims')
    .select('*', { count: 'exact', head: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('getClaimsCount error:', error);
    if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
      return 0;
    }
    throw error;
  }

  return count ?? 0;
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
