import { supabase } from '@/utils/supabase';

export type MediaType = 'photo' | 'lidar_room';
export type MediaStatus = 'pending' | 'uploading' | 'uploaded' | 'annotating' | 'done' | 'error';

export interface PhotoQC {
  blur_score?: number;
  glare?: boolean;
  underexposed?: boolean;
  distance_hint_m?: number;
}

export interface Detection {
  id: string;
  label: string;
  friendly?: string;
  severity?: 'minor' | 'moderate' | 'severe' | 'uncertain';
  confidence?: number;
  evidence?: string;
  tags?: string[];
  shape: {
    type: 'bbox';
    box: { x: number; y: number; w: number; h: number };
  } | {
    type: 'polygon';
    points: [number, number][];
  };
}

export interface AnnotationJSON {
  detections: Detection[];
  photo_qc?: PhotoQC;
  model?: { name: string; ts: string };
}

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
  qc: PhotoQC | null;
  annotation_json?: AnnotationJSON | null;
  redaction_json?: Record<string, unknown> | null;
  derived?: Record<string, unknown> | null;
  last_error?: string | null;
}

export interface MediaFilters {
  type?: MediaType;
  status?: MediaStatus;
  claim_id?: string;
  user_id?: string;
  org_id?: string;
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

export async function getMediaForClaim(claimId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export async function listMedia(limit = 100, filters?: MediaFilters): Promise<MediaItem[]> {
  let query = supabase.from('media').select('*');
  
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.claim_id) query = query.eq('claim_id', filters.claim_id);
  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  if (filters?.org_id) query = query.eq('org_id', filters.org_id);
  
  query = query.order('created_at', { ascending: false }).limit(limit);
  
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const { data, error } = await supabase.from('media').select('*').eq('id', id).maybeSingle();
  if (error) return null;
  return (data as MediaItem) ?? null;
}

export function getPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export async function batchAssignToClaim(mediaIds: string[], claim_id: string | null) {
  if (!mediaIds.length) return;
  const { error } = await supabase.from('media').update({ claim_id }).in('id', mediaIds);
  if (error) throw error;
}

export async function saveRedactions(mediaId: string, redaction_json: Record<string, unknown>) {
  const { error } = await supabase.from('media').update({ redaction_json }).eq('id', mediaId);
  if (error) throw error;
}

// Alias for backward compatibility with gallery.ts
export const assignMediaToClaim = batchAssignToClaim;
