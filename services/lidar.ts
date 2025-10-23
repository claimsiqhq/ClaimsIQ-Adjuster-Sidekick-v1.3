// services/lidar.ts
import { lidarScanner } from '@/modules/lidar';
import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks if the device supports LiDAR scanning.
 * This function queries the underlying `lidarScanner` module to determine if the necessary
 * hardware is available and operational. It's a crucial first step before attempting to
 * initiate a scan.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if LiDAR is available, `false` otherwise.
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
 * Starts the LiDAR scanning process.
 * Before starting, it performs a check for LiDAR support and will throw an error if the
 * hardware is not available. This ensures that the app does not attempt to use features
 * on unsupported devices.
 *
 * @returns {Promise<void>} A promise that resolves when the scan has successfully started.
 * @throws {Error} Throws an error if LiDAR is not available on the device.
 */
export async function startLiDARScan(): Promise<void> {
  const available = await checkLiDARSupport();

  if (!available) {
    throw new Error('LiDAR is not available on this device. Requires iPhone 12 Pro or newer.');
  }

  await lidarScanner.startScanning();
}

/**
 * Stops the currently active LiDAR scan.
 *
 * @returns {Promise<any>} A promise that resolves with the result of stopping the scan,
 *          which may include the scan data or a status indicator.
 */
export async function stopLiDARScan() {
  return lidarScanner.stopScanning();
}

/**
 * Retrieves statistics about the current or most recent LiDAR scan.
 * This can include information such as the number of points captured, mesh count, and other
 * relevant metrics.
 *
 * @returns {Promise<any>} A promise that resolves with an object containing scan statistics.
 */
export async function getScanStats() {
  return lidarScanner.getScanStats();
}

/**
 * Saves the completed LiDAR scan data.
 * This function handles the entire process of saving a scan, which includes:
 * 1. Uploading the PLY file (point cloud data) to Supabase storage.
 * 2. Creating a new media record in the database with metadata about the scan.
 * 3. Cleaning up the local temporary file to free up storage space.
 *
 * @param {any} scanData - An object containing the scan data, including the local file path.
 * @param {string} claimId - The ID of the claim to associate the scan with.
 * @param {string} [label] - An optional label or name for the scan.
 * @returns {Promise<string>} A promise that resolves to the new media record's ID.
 * @throws {Error} Throws an error if any part of the saving process fails.
 */
export async function saveScan(scanData: any, claimId: string, label?: string): Promise<string> {
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
          file_size: fileData.length,
          dimensions: scanData.dimensions,
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

