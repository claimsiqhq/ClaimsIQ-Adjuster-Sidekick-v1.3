// app/photo/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { getMediaById, getPublicUrl, MediaItem, Detection } from '@/services/media';
import PhotoOverlay from '@/components/photoOverlay';

export default function PhotoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const row = await getMediaById(id);
      setMedia(row);
      setImgUrl(getPublicUrl(row?.storage_path ?? null));
      setLoading(false);
    })();
  }, [id]);

  const detections = useMemo(() => {
    const raw = media?.annotation_json;
    const list = Array.isArray(raw?.detections) ? raw.detections : [];
    return list as Detection[];
  }, [media]);

  const w = Dimensions.get('window').width;
  const imgW = w;
  const imgH = Math.round((w * 3) / 4);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!media || !imgUrl) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.core }}>Photo not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <Text style={styles.title}>Photo</Text>
        <View style={styles.row}>
          <Text style={styles.k}>Overlay</Text>
          <Switch value={overlay} onValueChange={setOverlay} />
        </View>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: imgW, height: imgH }}>
          <Image source={{ uri: imgUrl }} style={{ width: imgW, height: imgH, borderRadius: 8 }} resizeMode="cover" />
          <PhotoOverlay width={imgW} height={imgH} detections={detections} visible={overlay} />
        </View>
      </View>

      {/* Photo Quality Metrics */}
      {media.qc && (
        <View style={styles.panel}>
          <Text style={styles.h}>Photo Quality</Text>
          
          {typeof media.qc.blur_score === 'number' && (
            <View style={styles.qcRow}>
              <Text style={styles.qcLabel}>Blur Score:</Text>
              <View style={styles.qcValue}>
                <Text style={[styles.qcText, media.qc.blur_score > 0.5 && styles.qcWarning]}>
                  {(media.qc.blur_score * 100).toFixed(0)}%
                </Text>
                {media.qc.blur_score > 0.5 && (
                  <Text style={styles.qcBadge}>⚠️ Consider retaking</Text>
                )}
              </View>
            </View>
          )}
          
          {typeof media.qc.glare === 'boolean' && media.qc.glare && (
            <View style={styles.qcRow}>
              <Text style={styles.qcLabel}>Glare Detected:</Text>
              <Text style={styles.qcWarning}>⚠️ Yes - may affect analysis</Text>
            </View>
          )}
          
          {typeof media.qc.underexposed === 'boolean' && media.qc.underexposed && (
            <View style={styles.qcRow}>
              <Text style={styles.qcLabel}>Lighting:</Text>
              <Text style={styles.qcWarning}>⚠️ Underexposed - too dark</Text>
            </View>
          )}
          
          {typeof media.qc.distance_hint_m === 'number' && (
            <View style={styles.qcRow}>
              <Text style={styles.qcLabel}>Distance:</Text>
              <Text style={styles.qcText}>~{media.qc.distance_hint_m.toFixed(1)}m</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.h}>Detections ({detections.length})</Text>
        {detections.map((d) => (
          <View key={d.id} style={styles.det}>
            <Text style={styles.detTitle}>
              {d.friendly ?? d.label} {typeof d.confidence === 'number' ? `· ${(d.confidence * 100).toFixed(0)}%` : ''}
            </Text>
            {d.evidence ? <Text style={styles.detSub}>{d.evidence}</Text> : null}
            {d.severity ? <Text style={styles.badge}>{d.severity}</Text> : null}
          </View>
        ))}
        {detections.length === 0 ? <Text style={styles.detSub}>No issues detected.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSoft },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.core },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  k: { color: colors.core, fontWeight: '600' },
  panel: { backgroundColor: colors.white, borderRadius: 16, padding: 12, margin: 16, borderWidth: 1, borderColor: colors.line },
  h: { color: colors.core, fontWeight: '700', marginBottom: 8 },
  det: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  detTitle: { color: colors.core, fontWeight: '600' },
  detSub: { color: '#5F6771' },
  badge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: colors.light, color: colors.core, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  qcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  qcLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
  },
  qcValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qcText: {
    fontSize: 14,
    color: colors.textLight,
  },
  qcWarning: {
    color: colors.warning,
    fontWeight: '600',
  },
  qcBadge: {
    fontSize: 11,
    color: colors.warning,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
