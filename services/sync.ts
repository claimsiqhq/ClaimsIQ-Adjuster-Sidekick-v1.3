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
 * Performs a full bidirectional synchronization between the local database and the Supabase backend.
 * This function first pushes any pending local changes to the remote, and then pulls the latest
 * data from the remote to the local database.
 *
 * @returns {Promise<SyncResult>} A promise that resolves to a `SyncResult` object, detailing the
 *          outcome of the sync operation, including counts of pushed and pulled records and any errors.
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
 * Processes the queue of pending local changes and pushes them to the Supabase backend.
 * It iterates through each queued operation, attempts to apply it to the remote database,
 * and then marks it as either completed or failed.
 *
 * @returns {Promise<{ count: number; errors: string[] }>} A promise that resolves to an object
 *          containing the number of successfully pushed operations and any error messages.
 */
export async function pushChanges(): Promise<{ count: number; errors: string[] }> {
  // Check authentication first
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { count: 0, errors: ['Not authenticated. Please log in again.'] };
  }

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
 * Fetches the latest data (claims and media) from the Supabase backend and saves it
 * to the local SQLite database. This ensures that the local data is up-to-date with the remote.
 *
 * @returns {Promise<{ count: number; errors: string[] }>} A promise that resolves to an object
 *          containing the total number of records pulled and any error messages.
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
 * A simple conflict resolution strategy based on the 'last write wins' principle.
 * It compares the `updated_at` timestamps of local and remote versions of a record
 * and returns the more recent one.
 *
 * @param {any} localVersion - The local version of the record.
 * @param {any} remoteVersion - The remote version of the record.
 * @returns {Promise<any>} A promise that resolves to the version that should be kept.
 */
export async function resolveConflict(localVersion: any, remoteVersion: any): Promise<any> {
  const localTime = new Date(localVersion.updated_at).getTime();
  const remoteTime = new Date(remoteVersion.updated_at).getTime();

  // Use the most recently updated version
  return remoteTime > localTime ? remoteVersion : localVersion;
}

/**
 * Retrieves statistics about the current synchronization status, such as the number
 * of pending operations.
 *
 * @returns {Promise<{ pendingOperations: number; lastSyncTime: null; hasUnsyncedChanges: boolean }>}
 *          A promise that resolves to an object with sync statistics.
 */
export async function getSyncStats() {
  const pending = await getPendingSyncOps();
  return {
    pendingOperations: pending.length,
    lastSyncTime: null, // Could store this in AsyncStorage
    hasUnsyncedChanges: pending.length > 0,
  };
}

