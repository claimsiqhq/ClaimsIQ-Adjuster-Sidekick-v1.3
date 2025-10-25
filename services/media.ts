import { supabase } from '@/utils/supabase';
import { invokeAnnotation } from '@/services/annotate';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

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

/**
 * Uploads a photo from a local file URI to Supabase storage.
 * It reads the file as a base64 string, decodes it into an ArrayBuffer, and then uploads it.
 * This function is designed to work within a React Native environment using Expo FileSystem.
 *
 * @param {string} localUri - The local URI of the photo to be uploaded.
 * @param {string} path - The destination path in the Supabase storage bucket.
 * @returns {Promise<string>} A promise that resolves to the storage path of the uploaded file.
 * @throws {Error} Throws an error if the upload fails.
 */
export async function uploadPhotoToStorage(localUri: string, path: string): Promise<string> {
  try {
    // Check authentication first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in again.');
    }

    // Read the file as base64 for React Native compatibility
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer using base64-arraybuffer package
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from('media')
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;
    return path;
  } catch (error: any) {
    console.error('Upload error details:', error);
    throw new Error(`Failed to upload photo: ${error?.message || error}`);
  }
}

/**
 * Inserts a new media record into the database.
 *
 * @param {Partial<MediaItem>} row - An object containing the media item's data.
 * @returns {Promise<MediaItem>} A promise that resolves to the newly created media item.
 * @throws {Error} Throws an error if the database insertion fails.
 */
export async function insertMediaRow(row: Partial<MediaItem>): Promise<MediaItem> {
  const { data, error } = await supabase.from('media').insert(row).select('*').single();
  if (error) throw error;
  return data as MediaItem;
}

/**
 * Retrieves all media items associated with a specific claim.
 *
 * @param {string} claimId - The ID of the claim to fetch media for.
 * @returns {Promise<MediaItem[]>} A promise that resolves to an array of media items.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function getMediaForClaim(claimId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

/**
 * A simplified function to upload a photo from base64 data, create a media record, and trigger annotation.
 * This is designed for use in capture screens where a quick, streamlined process is needed.
 *
 * @param {string} base64Data - The base64-encoded string of the photo.
 * @param {string} claimId - The ID of the claim to associate the photo with.
 * @param {string} userId - The ID of the user uploading the photo.
 * @returns {Promise<MediaItem | null>} A promise that resolves to the new media item, or null if an error occurs.
 * @throws {Error} Throws an error if the upload or database insertion fails.
 */
export async function uploadMedia(base64Data: string, claimId: string, userId: string): Promise<MediaItem | null> {
  try {
    // Generate a unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const path = `photos/${filename}`;

    // Convert base64 to ArrayBuffer for React Native
    const arrayBuffer = decode(base64Data);
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) throw uploadError;

    // Create media record in database
    const mediaRecord: Partial<MediaItem> = {
      user_id: userId,
      claim_id: claimId,
      type: 'photo',
      status: 'pending',
      storage_path: path,
    };

    const { data, error: dbError } = await supabase
      .from('media')
      .insert(mediaRecord)
      .select('*')
      .single();

    if (dbError) throw dbError;

    // Trigger annotation if available
    try {
      await invokeAnnotation(data.id);
    } catch (e) {
      console.log('Annotation service not available:', e);
    }

    return data as MediaItem;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

/**
 * Lists media items with optional filtering and pagination.
 *
 * @param {number} [limit=100] - The maximum number of media items to return.
 * @param {MediaFilters} [filters] - An object containing filter criteria.
 * @param {number} [offset=0] - The number of items to skip for pagination.
 * @returns {Promise<MediaItem[]>} A promise that resolves to an array of media items.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function listMedia(
  limit = 100,
  filters?: MediaFilters,
  offset = 0
): Promise<MediaItem[]> {
  let query = supabase.from('media').select('*');

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.claim_id) query = query.eq('claim_id', filters.claim_id);
  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  if (filters?.org_id) query = query.eq('org_id', filters.org_id);

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

/**
 * Gets the total count of media items with optional filtering.
 *
 * @param {MediaFilters} [filters] - An object containing filter criteria.
 * @returns {Promise<number>} A promise that resolves to the total count.
 * @throws {Error} Throws an error if the database query fails.
 */
export async function getMediaCount(filters?: MediaFilters): Promise<number> {
  let query = supabase.from('media').select('*', { count: 'exact', head: true });

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.claim_id) query = query.eq('claim_id', filters.claim_id);
  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  if (filters?.org_id) query = query.eq('org_id', filters.org_id);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Retrieves a single media item by its unique ID and enriches it with a public URL.
 *
 * @param {string} id - The ID of the media item to retrieve.
 * @returns {Promise<MediaItem | null>} A promise that resolves to the media item, or null if not found.
 */
export async function getMediaById(id: string): Promise<MediaItem | null> {
  const { data, error } = await supabase.from('media').select('*').eq('id', id).maybeSingle();
  if (error) return null;

  // Transform the data to match the expected format for Photo Detail Screen
  if (data) {
    const mediaItem = data as MediaItem;
    // Get public URL if we have a storage path
    const publicUrl = getPublicUrl(mediaItem.storage_path);

    return {
      ...mediaItem,
      public_url: publicUrl || '',
      status: mediaItem.status as any,
      annotations: mediaItem.annotation_json as any,
    } as any;
  }
  return null;
}

/**
 * Generates a public URL for a given storage path.
 *
 * @param {string | null | undefined} path - The storage path of the media item.
 * @returns {string | null} The public URL, or null if the path is invalid.
 */
export function getPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/**
 * Assigns a batch of media items to a claim. Can also be used to unassign by passing `null`.
 *
 * @param {string[]} mediaIds - An array of media item IDs to update.
 * @param {string | null} claim_id - The ID of the claim to assign the media to, or null to unassign.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if the update operation fails.
 */
export async function batchAssignToClaim(mediaIds: string[], claim_id: string | null) {
  if (!mediaIds.length) return;
  const { error } = await supabase.from('media').update({ claim_id }).in('id', mediaIds);
  if (error) throw error;
}

/**
 * Saves redaction data for a specific media item.
 *
 * @param {string} mediaId - The ID of the media item to update.
 * @param {Record<string, unknown>} redaction_json - The redaction data to save.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if the update operation fails.
 */
export async function saveRedactions(mediaId: string, redaction_json: Record<string, unknown>) {
  const { error } = await supabase.from('media').update({ redaction_json }).eq('id', mediaId);
  if (error) throw error;
}

// Alias for backward compatibility with gallery.ts
export const assignMediaToClaim = batchAssignToClaim;
