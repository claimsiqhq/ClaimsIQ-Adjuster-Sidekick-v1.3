// components/ModelViewer.tsx
// 3D model viewer using React Three Fiber

import React, { Suspense } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls, Box } from '@react-three/drei/native';
import { colors } from '@/theme/colors';

interface ModelViewerProps {
  modelPath: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  width: number;
  height: number;
}

export default function ModelViewer({ modelPath, dimensions, width, height }: ModelViewerProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <pointLight position={[-10, -10, -10]} />
          
          {/* Placeholder box - replace with PLY loader when available */}
          {dimensions ? (
            <Box args={[dimensions.width, dimensions.height, dimensions.depth]}>
              <meshStandardMaterial color={colors.primary} wireframe />
            </Box>
          ) : (
            <Box args={[2, 2, 2]}>
              <meshStandardMaterial color={colors.primary} wireframe />
            </Box>
          )}
          
          <OrbitControls enablePan enableZoom enableRotate />
        </Suspense>
      </Canvas>

      {/* Dimensions overlay */}
      {dimensions && (
        <View style={styles.dimensionsOverlay}>
          <View style={styles.dimCard}>
            <Text style={styles.dimLabel}>Width</Text>
            <Text style={styles.dimValue}>{(dimensions.width * 3.281).toFixed(2)} ft</Text>
          </View>
          <View style={styles.dimCard}>
            <Text style={styles.dimLabel}>Height</Text>
            <Text style={styles.dimValue}>{(dimensions.height * 3.281).toFixed(2)} ft</Text>
          </View>
          <View style={styles.dimCard}>
            <Text style={styles.dimLabel}>Depth</Text>
            <Text style={styles.dimValue}>{(dimensions.depth * 3.281).toFixed(2)} ft</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.darkBg,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dimensionsOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  dimCard: {
    flex: 1,
    backgroundColor: 'rgba(124, 58, 237, 0.95)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dimLabel: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 4,
    fontWeight: '600',
  },
  dimValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});

