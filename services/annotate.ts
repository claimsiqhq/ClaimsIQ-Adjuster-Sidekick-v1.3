// services/annotate.ts
import { supabase } from '@/utils/supabase';

export async function invokeAnnotation(mediaId: string, path?: string, sceneTags?: string[]) {
  const { data, error } = await supabase.functions.invoke('vision-annotate', {
    body: { mediaId, path: path ?? null, sceneTags: sceneTags ?? [] },
  });
  if (error) throw error;
  return data as { ok: boolean; anno_count?: number; error?: string };
}
