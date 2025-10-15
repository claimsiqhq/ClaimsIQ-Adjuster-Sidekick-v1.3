// components/LiDARViewer.tsx
// 3D visualization of LiDAR point cloud data

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Canvas, useCanvasRef } from '@shopify/react-native-skia';
import { colors } from '@/theme/colors';

interface LiDARViewerProps {
  width: number;
  height: number;
  scanData?: {
    pointCount: number;
    meshCount: number;
  };
  visible?: boolean;
}

export default function LiDARViewer({ width, height, scanData, visible = true }: LiDARViewerProps) {
  if (!visible || !scanData) {
    return null;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ flex: 1 }}>
        {/* Placeholder for 3D visualization */}
        {/* In production, render point cloud using Three.js or native SceneKit */}
      </Canvas>
      
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {scanData.pointCount.toLocaleString()} points
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {scanData.meshCount} meshes
          </Text>
        </View>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📐</Text>
        <Text style={styles.placeholderSubtext}>3D Visualization</Text>
        <Text style={styles.infoText}>
          {scanData.pointCount.toLocaleString()} points captured
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.darkBg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});


