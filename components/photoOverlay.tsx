// components/PhotoOverlay.tsx
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Rect, Path, Paint, Group } from '@shopify/react-native-skia';
import { Detection } from '@/services/media';

export default function PhotoOverlay({
  detections,
  width,
  height,
  visible
}: {
  detections: Detection[];
  width: number;
  height: number;
  visible: boolean;
}) {
  const { boxes, polys } = useMemo(() => {
    const b: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];
    const p: Array<{ d: string; color: string }> = [];
    const colorFor = (sev?: string) =>
      sev === 'severe' ? '#D32F2F' : sev === 'moderate' ? '#F57C00' : sev === 'minor' ? '#1976D2' : '#7B1FA2';

    for (const det of detections ?? []) {
      const color = colorFor(det.severity);
      if (det.shape.type === 'bbox') {
        const { x, y, w, h } = det.shape.box;
        b.push({ x: x * width, y: y * height, w: w * width, h: h * height, color });
      } else {
        const pts = det.shape.points;
        if (pts && pts.length > 2) {
          const path = pts
            .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0] * width} ${pt[1] * height}`)
            .join(' ') + ' Z';
          p.push({ d: path, color });
        }
      }
    }
    return { boxes: b, polys: p };
  }, [detections, width, height]);

  if (!visible) return <View style={{ width, height }} />;

  return (
    <View style={{ width, height }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Group>
          {boxes.map((r, i) => (
            <Rect key={'r' + i} x={r.x} y={r.y} width={r.w} height={r.h} color={r.color} style="stroke" strokeWidth={3} />
          ))}
          {polys.map((pp, i) => (
            <Path key={'p' + i} path={pp.d}>
              <Paint style="stroke" color={pp.color} strokeWidth={3} />
            </Path>
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
