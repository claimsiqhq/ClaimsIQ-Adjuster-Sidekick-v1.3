// services/offline.ts
// Offline functionality and network detection

import NetInfo from '@react-native-community/netinfo';
import { executeQuery, queryAll, queryFirst } from '@/utils/db';

let isOnlineState = true;

// Initialize network listener
NetInfo.addEventListener(state => {
  isOnlineState = !!state.isConnected;
});

/**
 * Checks if the device is currently connected to a network.
 * This function returns the last known online status, which is updated by a network event listener.
 * It provides a quick, synchronous way to check for connectivity.
 *
 * @returns {boolean} `true` if the device is online, `false` otherwise.
 */
export function isOnline(): boolean {
  return isOnlineState;
}

/**
 * Fetches the current detailed network state of the device.
 * This function provides more in-depth information than `isOnline`, including the connection type
 * and whether the internet is actually reachable.
 *
 * @returns {Promise<{ isConnected: boolean; isInternetReachable: boolean; type: string }>} A promise that
 *          resolves to an object with details about the network connection.
 */
export async function getNetworkState() {
  const state = await NetInfo.fetch();
  return {
    isConnected: !!state.isConnected,
    isInternetReachable: !!state.isInternetReachable,
    type: state.type,
  };
}

/**
 * Queues a database operation (insert, update, or delete) to be synced with the backend later.
 * When the app is offline, this function stores the intended operation in a local sync queue,
 * allowing the user to continue working.
 *
 * @param {string} table - The name of the table the operation applies to.
 * @param {'insert' | 'update' | 'delete'} operation - The type of database operation.
 * @param {string} recordId - The unique ID of the record being modified.
 * @param {any} data - The data associated with the operation (e.g., the new row for an insert).
 * @returns {Promise<void>} A promise that resolves when the operation has been successfully queued.
 */
export async function queueOperation(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
  data: any
): Promise<void> {
  const id = `${table}_${operation}_${recordId}_${Date.now()}`;

  await executeQuery(
    `INSERT INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, table, operation, recordId, JSON.stringify(data), Date.now()]
  );
}

/**
 * Retrieves all pending operations from the sync queue.
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of pending sync operations.
 */
export async function getPendingSyncOps(): Promise<any[]> {
  return queryAll(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC`);
}

/**
 * Marks a specific sync operation as completed.
 *
 * @param {string} id - The unique ID of the sync operation to mark as complete.
 * @returns {Promise<void>}
 */
export async function markSyncCompleted(id: string): Promise<void> {
  await executeQuery(`UPDATE sync_queue SET synced = 1 WHERE id = ?`, [id]);
}

/**
 * Marks a specific sync operation as failed and increments its retry count.
 *
 * @param {string} id - The unique ID of the sync operation.
 * @param {string} error - The error message associated with the failure.
 * @returns {Promise<void>}
 */
export async function markSyncFailed(id: string, error: string): Promise<void> {
  await executeQuery(`UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?`, [error, id]);
}

/**
 * Removes old, completed sync operations from the queue to keep the database tidy.
 *
 * @returns {Promise<void>}
 */
export async function clearOldSyncOps(): Promise<void> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await executeQuery(`DELETE FROM sync_queue WHERE synced = 1 AND created_at < ?`, [sevenDaysAgo]);
}

/**
 * Gets the user's preference for offline mode.
 * In this implementation, it's based on the current network state, but it could be extended
 * to use a stored user preference.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the app should operate in offline mode.
 */
export async function getOfflineMode(): Promise<boolean> {
  // Could be stored in AsyncStorage as user preference
  return !isOnlineState;
}

/**
 * Saves or updates a claim in the local database for offline access.
 *
 * @param {any} claim - The claim object to be saved.
 * @returns {Promise<void>}
 */
export async function saveLocalClaim(claim: any): Promise<void> {
  const existing = await queryFirst(`SELECT id FROM claims WHERE id = ?`, [claim.id]);

  if (existing) {
    await executeQuery(
      `UPDATE claims SET
        updated_at = ?,
        claim_number = ?,
        insured_name = ?,
        loss_type = ?,
        status = ?,
        metadata = ?,
        synced = ?
      WHERE id = ?`,
      [
        Date.now(),
        claim.claim_number,
        claim.insured_name,
        claim.loss_type,
        claim.status,
        JSON.stringify(claim.metadata || {}),
        1,
        claim.id,
      ]
    );
  } else {
    await executeQuery(
      `INSERT INTO claims (
        id, created_at, updated_at, claim_number, insured_name,
        loss_type, status, metadata, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        claim.id,
        new Date(claim.created_at).getTime(),
        Date.now(),
        claim.claim_number,
        claim.insured_name,
        claim.loss_type,
        claim.status,
        JSON.stringify(claim.metadata || {}),
        1,
      ]
    );
  }
}

/**
 * Saves or updates a media item in the local database for offline access.
 *
 * @param {any} media - The media item object to be saved.
 * @returns {Promise<void>}
 */
export async function saveLocalMedia(media: any): Promise<void> {
  const existing = await queryFirst(`SELECT id FROM media WHERE id = ?`, [media.id]);

  if (existing) {
    await executeQuery(
      `UPDATE media SET
        updated_at = ?,
        claim_id = ?,
        type = ?,
        status = ?,
        label = ?,
        storage_path = ?,
        annotation_json = ?,
        synced = ?
      WHERE id = ?`,
      [
        Date.now(),
        media.claim_id,
        media.type,
        media.status,
        media.label,
        media.storage_path,
        JSON.stringify(media.annotation_json || {}),
        1,
        media.id,
      ]
    );
  } else {
    await executeQuery(
      `INSERT INTO media (
        id, created_at, updated_at, claim_id, type, status,
        label, storage_path, annotation_json, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        new Date(media.created_at).getTime(),
        Date.now(),
        media.claim_id,
        media.type,
        media.status,
        media.label,
        media.storage_path,
        JSON.stringify(media.annotation_json || {}),
        1,
      ]
    );
  }
}

/**
 * Retrieves all claims stored in the local database.
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of local claims.
 */
export async function getLocalClaims(): Promise<any[]> {
  return queryAll(`SELECT * FROM claims ORDER BY created_at DESC`);
}

/**
 * Retrieves media items from the local database, optionally filtered by claim ID.
 *
 * @param {string} [claimId] - Optional. The ID of the claim to filter media by.
 * @returns {Promise<any[]>} A promise that resolves to an array of local media items.
 */
export async function getLocalMedia(claimId?: string): Promise<any[]> {
  if (claimId) {
    return queryAll(`SELECT * FROM media WHERE claim_id = ? ORDER BY created_at DESC`, [claimId]);
  }
  return queryAll(`SELECT * FROM media ORDER BY created_at DESC`);
}

