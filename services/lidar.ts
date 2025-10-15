// services/lidar.ts
import { lidarScanner } from '@/modules/lidar';
import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

export async function checkLiDARSupport(): Promise<boolean> {
  try {
    return await lidarScanner.isLiDARAvailable();
  } catch (error) {
    console.error('LiDAR check error:', error);
    return false;
  }
}

export async function startLiDARScan(): Promise<void> {
  const available = await checkLiDARSupport();
  
  if (!available) {
    throw new Error('LiDAR is not available on this device. Requires iPhone 12 Pro or newer.');
  }

  await lidarScanner.startScanning();
}

export async function stopLiDARScan() {
  return lidarScanner.stopScanning();
}

export async function getScanStats() {
  return lidarScanner.getScanStats();
}

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

