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

export async function listPrompts(options?: { activeOnly?: boolean; keyPrefix?: string }) {
  let q = supabase.from('app_prompts').select('*').order('updated_at', { ascending: false });
  if (options?.activeOnly) q = q.eq('is_active', true);
  if (options?.keyPrefix) q = q.like('key', `${options.keyPrefix}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AppPrompt[];
}

export async function getActivePrompt(key: string) {
  const { data, error } = await supabase.from('app_prompts').select('*').eq('key', key).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return (data ?? null) as AppPrompt | null;
}

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
