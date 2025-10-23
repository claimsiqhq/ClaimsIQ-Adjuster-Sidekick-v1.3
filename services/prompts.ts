// services/prompts.ts
import { supabase } from '@/utils/supabase';

export type PromptRole = 'system' | 'user' | 'tool';

export interface AppPrompt {
  id: string;
  created_at: string;
  updated_at: string;
  org_id: string | null;
  key: string;
  role: PromptRole;
  description: string | null;
  template: string;
  is_active: boolean;
}

/**
 * Lists all application prompts from the database, with optional filtering.
 * This function allows for fetching prompts based on their active status or a key prefix,
 * making it useful for managing and retrieving prompts in different contexts.
 *
 * @param {object} [options] - Optional filtering criteria.
 * @param {boolean} [options.activeOnly] - If `true`, returns only the active prompts.
 * @param {string} [options.keyPrefix] - Filters prompts by a key prefix (e.g., 'fnol_').
 * @returns {Promise<AppPrompt[]>} A promise that resolves to an array of application prompts.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function listPrompts(options?: { activeOnly?: boolean; keyPrefix?: string }) {
  let q = supabase.from('app_prompts').select('*').order('updated_at', { ascending: false });
  if (options?.activeOnly) q = q.eq('is_active', true);
  if (options?.keyPrefix) q = q.like('key', `${options.keyPrefix}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AppPrompt[];
}

/**
 * Retrieves the currently active prompt for a given key.
 * In a system where multiple versions of a prompt can exist, this function ensures that
 * only the one marked as 'active' is returned.
 *
 * @param {string} key - The unique key identifying the prompt.
 * @returns {Promise<AppPrompt | null>} A promise that resolves to the active prompt, or `null` if not found.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function getActivePrompt(key: string) {
  const { data, error } = await supabase.from('app_prompts').select('*').eq('key', key).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return (data ?? null) as AppPrompt | null;
}

/**
 * Creates a new version of a prompt.
 * If the new prompt is set to be active, this function will first deactivate any existing
 * active prompt with the same key, ensuring that only one version is active at a time.
 *
 * @param {Omit<AppPrompt, 'id' | 'created_at' | 'updated_at'>} input - The data for the new prompt.
 * @returns {Promise<AppPrompt>} A promise that resolves to the newly created prompt.
 * @throws {Error} Throws an error if the database operation fails.
 */
export async function createPromptVersion(input: Omit<AppPrompt, 'id' | 'created_at' | 'updated_at'>) {
  // Deactivate any active version of the same key if the new one is_active
  if (input.is_active) {
    const { error: deErr } = await supabase.from('app_prompts').update({ is_active: false }).eq('key', input.key).eq('is_active', true);
    if (deErr) throw deErr;
  }
  const { data, error } = await supabase
    .from('app_prompts')
    .insert({
      org_id: input.org_id ?? null,
      key: input.key,
      role: input.role,
      description: input.description ?? null,
      template: input.template,
      is_active: !!input.is_active,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as AppPrompt;
}

/**
 * Sets a specific version of a prompt as the active one.
 * This function first deactivates any currently active prompt with the same key before
 * activating the specified prompt. This ensures version control and consistency.
 *
 * @param {string} id - The unique ID of the prompt to be activated.
 * @returns {Promise<AppPrompt>} A promise that resolves to the now-active prompt.
 * @throws {Error} Throws an error if any of the database operations fail.
 */
export async function setActivePrompt(id: string) {
  // Get key of the prompt
  const { data: p, error: gErr } = await supabase.from('app_prompts').select('key').eq('id', id).single();
  if (gErr) throw gErr;
  const key = p.key as string;

  const { error: deErr } = await supabase.from('app_prompts').update({ is_active: false }).eq('key', key).eq('is_active', true);
  if (deErr) throw deErr;

  const { data, error } = await supabase.from('app_prompts').update({ is_active: true }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as AppPrompt;
}
