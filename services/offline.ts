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
 * Check if device is currently online
 */
export function isOnline(): boolean {
  return isOnlineState;
}

/**
 * Get current network state
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
 * Queue an operation for later sync when offline
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
 * Get all pending sync operations
 */
export async function getPendingSyncOps(): Promise<any[]> {
  return queryAll(
    `SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC`
  );
}

/**
 * Mark sync operation as completed
 */
export async function markSyncCompleted(id: string): Promise<void> {
  await executeQuery(
    `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
    [id]
  );
}

/**
 * Mark sync operation as failed
 */
export async function markSyncFailed(id: string, error: string): Promise<void> {
  await executeQuery(
    `UPDATE sync_queue SET error = ?, retry_count = retry_count + 1 WHERE id = ?`,
    [error, id]
  );
}

/**
 * Clear completed sync operations (older than 7 days)
 */
export async function clearOldSyncOps(): Promise<void> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await executeQuery(
    `DELETE FROM sync_queue WHERE synced = 1 AND created_at < ?`,
    [sevenDaysAgo]
  );
}

/**
 * Get offline/online mode preference
 */
export async function getOfflineMode(): Promise<boolean> {
  // Could be stored in AsyncStorage as user preference
  return !isOnlineState;
}

/**
 * Save data locally for offline access
 */
export async function saveLocalClaim(claim: any): Promise<void> {
  const existing = await queryFirst(
    `SELECT id FROM claims WHERE id = ?`,
    [claim.id]
  );

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
 * Save media locally for offline access
 */
export async function saveLocalMedia(media: any): Promise<void> {
  const existing = await queryFirst(
    `SELECT id FROM media WHERE id = ?`,
    [media.id]
  );

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
 * Get local claims (for offline use)
 */
export async function getLocalClaims(): Promise<any[]> {
  return queryAll(`SELECT * FROM claims ORDER BY created_at DESC`);
}

/**
 * Get local media (for offline use)
 */
export async function getLocalMedia(claimId?: string): Promise<any[]> {
  if (claimId) {
    return queryAll(
      `SELECT * FROM media WHERE claim_id = ? ORDER BY created_at DESC`,
      [claimId]
    );
  }
  return queryAll(`SELECT * FROM media ORDER BY created_at DESC`);
}

