// services/media.ts
import { supabase } from '@/utils/supabase';

export type MediaType = 'photo' | 'lidar_room';
export type MediaStatus = 'pending' | 'uploading' | 'uploaded' | 'annotating' | 'done' | 'error';

export interface MediaItem {
  id: string;                  // uuid
  claim_id: string | null;     // nullable for unassigned
  type: MediaType;
  status: MediaStatus;
  label: string | null;
  storage_path: string | null; // e.g., media/orgId/userId/uuid.jpg
  thumb_uri?: string;          // local preview (client only)
  anno_count: number | null;
  qc: any | null;
  created_at: string;          // timestamptz
}

/** Ensures bucket exists (no-op if already created). Call once at app start if desired. */
export async function ensureMediaBucket() {
  // As of now, supabase-js doesn't expose admin bucket create in client (needs service key).
  // Create 'media' bucket once in the Supabase dashboard (public).
  return true;
}

/** Upload a local file:// image to the 'media' bucket and return its storage path. */
export async function uploadPhotoToStorage(localUri: string, path: string): Promise<string> {
  // Fetch local file into a Blob (Expo supports file:// fetch -> blob)
  const resp = await fetch(localUri);
  const blob = await resp.blob();

  const { error } = await supabase
    .storage
    .from('media')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;
  return path;
}

/** Insert a row in media table. */
export async function insertMediaRow(row: Partial<MediaItem>): Promise<MediaItem> {
  const { data, error } = await supabase
    .from('media')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return data as MediaItem;
}

/** List latest media for current org/user (adjust filtering later). */
export async function listMedia(limit = 50): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MediaItem[];
}
