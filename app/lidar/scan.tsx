// app/lidar/scan.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { LiDARScannerView, lidarScanner } from '@/modules/lidar';
import { startLiDARScan, stopLiDARScan, saveScan, checkLiDARSupport } from '@/services/lidar';
import ModelViewer from '@/components/ModelViewer';

type ScanResult = {
  pointCount: number;
  meshCount: number;
  filePath: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
};

export default function LiDARScanScreen() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ pointCount: 0, meshCount: 0 });
  const [saving, setSaving] = useState(false);
  const [scanDuration, setScanDuration] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [mode, setMode] = useState<'scanning' | 'preview'>('scanning');

  useEffect(() => {
    checkSupport();
  }, []);

  useEffect(() => {
    if (scanning) {
      const interval = setInterval(async () => {
        const currentStats = await lidarScanner.getScanStats();
        setStats(currentStats);
        setScanDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [scanning]);

  async function checkSupport() {
    const isSupported = await checkLiDARSupport();
    setSupported(isSupported);
    
    if (!isSupported) {
      Alert.alert(
        'LiDAR Not Available',
        'This device does not support LiDAR scanning. Requires iPhone 12 Pro or newer with LiDAR sensor.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  async function handleStartScan() {
    try {
      await startLiDARScan();
      setScanning(true);
      setScanDuration(0);
      setStats({ pointCount: 0, meshCount: 0 });
      setMode('scanning');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleStopScan() {
    try {
      const result = await stopLiDARScan();
      setScanning(false);
      setScanResult(result);
      setMode('preview');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to stop scan: ' + error.message);
    }
  }

  async function handleSaveScan() {
    if (!scanResult || !claimId) {
      Alert.alert('Error', 'No scan data or claim ID');
      return;
    }

    try {
      setSaving(true);
      const label = `LiDAR Scan ${new Date().toLocaleString()}`;
      await saveScan(scanResult, claimId, label);

      Alert.alert(
        'Scan Complete!',
        `Successfully captured ${scanResult.pointCount.toLocaleString()} points.\n\nThe 3D scan has been saved to your claim.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save scan: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (supported === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking LiDAR support...</Text>
      </View>
    );
  }

  if (!supported) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>LiDAR Not Supported</Text>
        <Text style={styles.errorSubtext}>
          This device does not have a LiDAR sensor.{'\n'}
          Requires iPhone 12 Pro or newer.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const { width } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      {/* AR View or Preview */}
      <View style={styles.viewContainer}>
        {mode === 'scanning' ? (
          scanning ? (
            <LiDARScannerView style={styles.arView} />
          ) : (
            <View style={styles.arViewPlaceholder}>
              <Text style={styles.placeholderText}>Tap Start to begin scanning</Text>
              <Text style={styles.placeholderSubtext}>
                Point your camera at the room and move slowly
              </Text>
            </View>
          )
        ) : (
          scanResult && (
            <ModelViewer
              modelPath={scanResult.filePath}
              dimensions={scanResult.dimensions}
              width={width}
              height={500}
            />
          )
        )}
      </View>

      {/* Stats Overlay (scanning mode only) */}
      {scanning && mode === 'scanning' && (
        <View style={styles.statsOverlay}>
          <View style={styles.statsCard}>
            <Text style={styles.statsText}>● SCANNING</Text>
            <Text style={styles.statsText}>Points: {stats.pointCount.toLocaleString()}</Text>
            <Text style={styles.statsText}>Meshes: {stats.meshCount}</Text>
            <Text style={styles.statsText}>Time: {scanDuration}s</Text>
          </View>
        </View>
      )}

      {/* Instructions (scanning mode only) */}
      {!scanning && mode === 'scanning' && (
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to Scan:</Text>
          <Text style={styles.instructionText}>1. Tap "Start Scanning"</Text>
          <Text style={styles.instructionText}>2. Move slowly around the room</Text>
          <Text style={styles.instructionText}>3. Capture all walls and surfaces</Text>
          <Text style={styles.instructionText}>4. Tap "Complete Scan" when done</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {mode === 'scanning' ? (
          !scanning ? (
            <>
              <Pressable style={styles.startButton} onPress={handleStartScan}>
                <Text style={styles.startButtonText}>Start Scanning</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => router.back()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.stopButton} onPress={handleStopScan}>
              <Text style={styles.stopButtonText}>Complete Scan</Text>
            </Pressable>
          )
        ) : (
          <>
            <Pressable
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSaveScan}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save to Claim</Text>
              )}
            </Pressable>
            <Pressable style={styles.retryButton} onPress={() => {
              setScanResult(null);
              setMode('scanning');
            }}>
              <Text style={styles.retryButtonText}>Scan Again</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.core,
    marginTop: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.core,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  viewContainer: {
    flex: 1,
  },
  arView: {
    flex: 1,
  },
  arViewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkBg,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  statsOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 4,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  instructions: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    borderRadius: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    gap: 12,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: colors.success,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  retryButton: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.core,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.textLight,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
