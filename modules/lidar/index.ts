// modules/lidar/index.ts
// TypeScript interface for native LiDAR module

import { NativeModules, NativeEventEmitter, requireNativeComponent } from 'react-native';

const { LiDARScanner } = NativeModules;

export interface ScanStats {
  isScanning: boolean;
  pointCount: number;
  meshCount: number;
}

export interface ScanResult {
  pointCount: number;
  meshCount: number;
  timestamp: number;
}

export interface ExportResult {
  filePath: string;
  fileSize: number;
}

class LiDARScannerModule {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(LiDARScanner);
  }

  /**
   * Check if device supports LiDAR
   */
  async isLiDARAvailable(): Promise<boolean> {
    try {
      return await LiDARScanner.isLiDARAvailable();
    } catch (error) {
      console.error('LiDAR availability check failed:', error);
      return false;
    }
  }

  /**
   * Start LiDAR scanning session
   */
  async startScanning(): Promise<{ success: boolean }> {
    return LiDARScanner.startScanning();
  }

  /**
   * Stop scanning and get final mesh data
   */
  async stopScanning(): Promise<ScanResult> {
    return LiDARScanner.stopScanning();
  }

  /**
   * Export mesh as PLY file
   */
  async exportMesh(fileName: string): Promise<ExportResult> {
    return LiDARScanner.exportMesh(fileName);
  }

  /**
   * Get current scan statistics
   */
  async getScanStats(): Promise<ScanStats> {
    return LiDARScanner.getScanStats();
  }

  /**
   * Listen to scan progress events
   */
  onScanProgress(callback: (stats: ScanStats) => void): () => void {
    const subscription = this.eventEmitter.addListener('onScanProgress', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to scan completion
   */
  onScanComplete(callback: (result: ScanResult) => void): () => void {
    const subscription = this.eventEmitter.addListener('onScanComplete', callback);
    return () => subscription.remove();
  }

  /**
   * Listen to scan errors
   */
  onScanError(callback: (error: { message: string }) => void): () => void {
    const subscription = this.eventEmitter.addListener('onScanError', callback);
    return () => subscription.remove();
  }
}

export const lidarScanner = new LiDARScannerModule();

// Native view component
export const LiDARScannerView = requireNativeComponent<any>('LiDARScannerView');


