// app/lidar/scan.tsx
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { LiDARScannerView, lidarScanner } from '@/modules/lidar';
import { startLiDARScan, stopLiDARScan, saveScan, checkLiDARSupport, getScanStats } from '@/services/lidar';

export default function LiDARScanScreen() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ pointCount: 0, meshCount: 0 });
  const [saving, setSaving] = useState(false);
  const [scanDuration, setScanDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkSupport();
  }, []);

  useEffect(() => {
    if (scanning) {
      // Animate scanning indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Update stats every second
      const interval = setInterval(async () => {
        const currentStats = await getScanStats();
        setStats(currentStats);
        setScanDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(interval);
        pulseAnim.setValue(1);
      };
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
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleStopScan() {
    try {
      setSaving(true);
      const scanData = await stopLiDARScan();
      setScanning(false);

      if (!claimId) {
        Alert.alert('Error', 'No claim ID provided');
        router.back();
        return;
      }

      // Save scan to database
      const label = await promptForLabel();
      await saveScan(scanData, claimId, label);

      Alert.alert(
        'Scan Complete!',
        `Successfully captured ${scanData.pointCount.toLocaleString()} points.\n\nThe 3D scan has been saved to your claim.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save scan: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function promptForLabel(): Promise<string> {
    return new Promise((resolve) => {
      Alert.prompt(
        'Name This Scan',
        'Enter a label for this LiDAR scan:',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
          {
            text: 'Save',
            onPress: (label) => resolve(label || `LiDAR Scan ${new Date().toLocaleString()}`),
          },
        ],
        'plain-text',
        `Room ${new Date().toLocaleTimeString()}`
      );
    });
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AR View */}
      <View style={styles.arViewContainer}>
        {scanning ? (
          <LiDARScannerView style={styles.arView} />
        ) : (
          <View style={styles.arViewPlaceholder}>
            <Text style={styles.placeholderText}>Tap Start to begin scanning</Text>
            <Text style={styles.placeholderSubtext}>
              Point your camera at the room and move slowly
            </Text>
          </View>
        )}
      </View>

      {/* Stats Overlay */}
      {scanning && (
        <View style={styles.statsOverlay}>
          <Animated.View style={[styles.scanningIndicator, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.scanningText}>●</Text>
          </Animated.View>
          <View style={styles.statsCard}>
            <Text style={styles.statsText}>Points: {stats.pointCount.toLocaleString()}</Text>
            <Text style={styles.statsText}>Meshes: {stats.meshCount}</Text>
            <Text style={styles.statsText}>Time: {scanDuration}s</Text>
          </View>
        </View>
      )}

      {/* Instructions */}
      {!scanning && (
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
        {!scanning ? (
          <Pressable style={styles.startButton} onPress={handleStartScan}>
            <Text style={styles.startButtonText}>Start Scanning</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.stopButton, saving && styles.buttonDisabled]}
            onPress={handleStopScan}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.stopButtonText}>Complete Scan</Text>
            )}
          </Pressable>
        )}

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
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
    color: '#5F6771',
    textAlign: 'center',
    lineHeight: 20,
  },
  arViewContainer: {
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
  scanningIndicator: {
    marginBottom: 12,
  },
  scanningText: {
    fontSize: 20,
    color: '#EF4444',
  },
  statsCard: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
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


