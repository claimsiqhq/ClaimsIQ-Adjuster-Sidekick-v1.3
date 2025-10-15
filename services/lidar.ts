// services/lidar.ts
// LiDAR scanning operations and data management

import { lidarScanner } from '@/modules/lidar';
import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

export interface ScanData {
  pointCount: number;
  meshCount: number;
  filePath: string;
  fileSize: number;
  timestamp: number;
}

export interface LiDARMedia {
  id: string;
  claimId?: string;
  label: string;
  localFilePath: string;
  remoteStoragePath?: string;
  pointCount: number;
  meshCount: number;
  scanDuration?: number;
}

/**
 * Check if current device supports LiDAR
 */
export async function checkLiDARSupport(): Promise<boolean> {
  try {
    return await lidarScanner.isLiDARAvailable();
  } catch (error) {
    console.error('LiDAR check error:', error);
    return false;
  }
}

/**
 * Start a new LiDAR scanning session
 */
export async function startLiDARScan(): Promise<void> {
  const available = await checkLiDARSupport();
  
  if (!available) {
    throw new Error('LiDAR is not available on this device. Requires iPhone 12 Pro or newer.');
  }

  await lidarScanner.startScanning();
}

/**
 * Stop scanning and retrieve mesh data
 */
export async function stopLiDARScan(): Promise<ScanData> {
  const result = await lidarScanner.stopScanning();
  const fileName = `scan_${Date.now()}.ply`;
  const exportResult = await lidarScanner.exportMesh(fileName);

  return {
    pointCount: result.pointCount,
    meshCount: result.meshCount,
    filePath: exportResult.filePath,
    fileSize: exportResult.fileSize,
    timestamp: result.timestamp,
  };
}

/**
 * Get current scan statistics
 */
export async function getScanStats() {
  return lidarScanner.getScanStats();
}

/**
 * Save LiDAR scan to database and storage
 */
export async function saveScan(
  scanData: ScanData,
  claimId: string,
  label?: string
): Promise<string> {
  try {
    const mediaId = uuidv4();
    const storagePath = `lidar/${mediaId}_${Date.now()}.ply`;

    // Upload PLY file to Supabase storage
    const fileData = await FileSystem.readAsStringAsync(scanData.filePath);
    const blob = new Blob([fileData], { type: 'application/octet-stream' });

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, blob);

    if (uploadError) throw uploadError;

    // Create media record
    const { data, error: insertError } = await supabase
      .from('media')
      .insert({
        id: mediaId,
        claim_id: claimId,
        type: 'lidar_room',
        status: 'done',
        label: label || `LiDAR Scan ${new Date().toLocaleString()}`,
        storage_path: storagePath,
        qc: {
          point_count: scanData.pointCount,
          mesh_count: scanData.meshCount,
          file_size: scanData.fileSize,
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Clean up local file
    await FileSystem.deleteAsync(scanData.filePath, { idempotent: true });

    return mediaId;
  } catch (error: any) {
    console.error('Save scan error:', error);
    throw error;
  }
}

/**
 * List LiDAR scans for a claim
 */
export async function listLiDARScans(claimId: string) {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('type', 'lidar_room')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete LiDAR scan
 */
export async function deleteLiDARScan(scanId: string): Promise<void> {
  // Get scan record to find storage path
  const { data: scan } = await supabase
    .from('media')
    .select('storage_path')
    .eq('id', scanId)
    .single();

  if (scan?.storage_path) {
    // Delete from storage
    await supabase.storage.from('media').remove([scan.storage_path]);
  }

  // Delete record
  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', scanId);

  if (error) throw error;
}


