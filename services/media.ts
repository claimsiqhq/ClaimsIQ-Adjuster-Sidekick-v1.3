// services/media.ts
import { supabase } from '@/utils/supabase';

export type MediaType = 'photo' | 'lidar_room';
export type MediaStatus = 'pending' | 'uploading' | 'uploaded' | 'annotating' | 'done' | 'error';

export interface MediaItem {
  id: string;
  created_at: string;
  user_id: string | null;
  org_id: string | null;
  claim_id: string | null;
  type: MediaType;
  status: MediaStatus;
  label: string | null;
  storage_path: string | null;
  anno_count: number | null;
  qc: any | null;
  annotation_json?: any | null;
}

export async function uploadPhotoToStorage(localUri: string, path: string): Promise<string> {
  const resp = await fetch(localUri);
  const blob = await resp.blob();
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function insertMediaRow(row: Partial<MediaItem>): Promise<MediaItem> {
  const { data, error } = await supabase.from('media').insert(row).select('*').single();
  if (error) throw error;
  return data as MediaItem;
}

export async function listMedia(limit = 100): Promise<MediaItem[]> {
  const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const { data, error } = await supabase.from('media').select('*').eq('id', id).single();
  if (error) return null;
  return data as MediaItem;
}

export function getPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data?.publicUrl ?? null;
}
