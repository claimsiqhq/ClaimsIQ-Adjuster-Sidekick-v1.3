// modules/lidar/index.ts
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
  filePath: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

class LiDARScannerModule {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(LiDARScanner);
  }

  async isLiDARAvailable(): Promise<boolean> {
    try {
      return await LiDARScanner.isLiDARAvailable();
    } catch (error) {
      console.error('LiDAR availability check failed:', error);
      return false;
    }
  }

  async startScanning(): Promise<{ success: boolean }> {
    return LiDARScanner.startScanning();
  }

  async stopScanning(): Promise<ScanResult> {
    return LiDARScanner.stopScanning();
  }

  async getScanStats(): Promise<ScanStats> {
    return LiDARScanner.getScanStats();
  }

  onScanProgress(callback: (stats: ScanStats) => void): () => void {
    const subscription = this.eventEmitter.addListener('onScanProgress', callback);
    return () => subscription.remove();
  }
}

export const lidarScanner = new LiDARScannerModule();

// Only require native component on iOS where it exists
export const LiDARScannerView = (() => {
  try {
    return requireNativeComponent<any>('LiDARScannerView');
  } catch (error) {
    // Return a dummy component if native module doesn't exist
    console.warn('LiDARScannerView native component not available');
    return null as any;
  }
})();

