// services/sync.ts
// Background synchronization between local SQLite and Supabase

import { supabase } from '@/utils/supabase';
import { 
  getPendingSyncOps, 
  markSyncCompleted, 
  markSyncFailed,
  saveLocalClaim,
  saveLocalMedia,
  isOnline 
} from '@/services/offline';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
}

/**
 * Full bidirectional sync
 */
export async function syncNow(): Promise<SyncResult> {
  if (!isOnline()) {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      errors: ['Device is offline'],
    };
  }

  const result: SyncResult = {
    success: true,
    pushed: 0,
    pulled: 0,
    errors: [],
  };

  try {
    // First: Push local changes to Supabase
    const pushResult = await pushChanges();
    result.pushed = pushResult.count;
    result.errors.push(...pushResult.errors);

    // Then: Pull remote changes to local
    const pullResult = await pullChanges();
    result.pulled = pullResult.count;
    result.errors.push(...pullResult.errors);

    result.success = result.errors.length === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Push queued local changes to Supabase
 */
export async function pushChanges(): Promise<{ count: number; errors: string[] }> {
  const pending = await getPendingSyncOps();
  const errors: string[] = [];
  let count = 0;

  for (const op of pending) {
    try {
      const data = JSON.parse(op.data);

      switch (op.operation) {
        case 'insert':
          await supabase.from(op.table_name).insert(data);
          break;
        case 'update':
          await supabase.from(op.table_name).update(data).eq('id', op.record_id);
          break;
        case 'delete':
          await supabase.from(op.table_name).delete().eq('id', op.record_id);
          break;
      }

      await markSyncCompleted(op.id);
      count++;
    } catch (error: any) {
      errors.push(`${op.table_name}:${op.operation} - ${error.message}`);
      await markSyncFailed(op.id, error.message);
    }
  }

  return { count, errors };
}

/**
 * Pull changes from Supabase to local database
 */
export async function pullChanges(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  try {
    // Pull claims
    const { data: claims, error: claimsError } = await supabase
      .from('claims')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (claimsError) {
      errors.push(`Claims pull: ${claimsError.message}`);
    } else if (claims) {
      for (const claim of claims) {
        await saveLocalClaim(claim);
        count++;
      }
    }

    // Pull media
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (mediaError) {
      errors.push(`Media pull: ${mediaError.message}`);
    } else if (media) {
      for (const item of media) {
        await saveLocalMedia(item);
        count++;
      }
    }
  } catch (error: any) {
    errors.push(error.message);
  }

  return { count, errors };
}

/**
 * Conflict resolution: last-write-wins strategy
 */
export async function resolveConflict(localVersion: any, remoteVersion: any): Promise<any> {
  const localTime = new Date(localVersion.updated_at).getTime();
  const remoteTime = new Date(remoteVersion.updated_at).getTime();
  
  // Use the most recently updated version
  return remoteTime > localTime ? remoteVersion : localVersion;
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  const pending = await getPendingSyncOps();
  return {
    pendingOperations: pending.length,
    lastSyncTime: null, // Could store this in AsyncStorage
    hasUnsyncedChanges: pending.length > 0,
  };
}

