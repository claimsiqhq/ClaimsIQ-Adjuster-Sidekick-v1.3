// app/(tabs)/capture.tsx
import 'react-native-get-random-values';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image, Modal, ActivityIndicator, Alert } from 'react-native';
import * as CameraLib from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { colors } from '@/theme/colors';
import Header from '@/components/Header';
import { insertMediaRow, listMedia, uploadPhotoToStorage, MediaItem } from '@/services/media';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import { invokeAnnotation } from '@/services/annotate';

type GridItem = MediaItem & { thumb_uri?: string };

export default function CaptureScreen() {
  const [mode, setMode] = useState<'capture' | 'gallery'>('capture');
  const [items, setItems] = useState<GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = CameraLib.useCameraPermissions();
  const router = useRouter();

  async function loadGallery() {
    try {
      setLoading(true);
      const rows = await listMedia(100);
      setItems(rows);
    } catch (e: any) {
      console.error('loadGallery error', e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGallery();
  }, []);

  const onOpenCamera = async () => {
    const { granted } = permission ?? {};
    if (!granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setCameraOpen(true);
  };

  return (
    <View style={styles.container}>
      <Header title="Capture" subtitle="Photo • LiDAR • Documents" />
      <View style={styles.segment}>
        <Pressable onPress={() => setMode('capture')} style={[styles.segBtn, mode==='capture' && styles.segActive]}>
          <Text style={[styles.segText, mode==='capture' && styles.segTextActive]}>Capture</Text>
        </Pressable>
        <Pressable onPress={() => setMode('gallery')} style={[styles.segBtn, mode==='gallery' && styles.segActive]}>
          <Text style={[styles.segText, mode==='gallery' && styles.segTextActive]}>Gallery</Text>
        </Pressable>
      </View>

      {mode === 'capture' ? (
        <View style={styles.grid}>
          <Pressable style={[styles.tile, styles.a]} onPress={onOpenCamera}>
            <Text style={styles.tileH}>Photo</Text>
            <Text style={styles.tileP}>Open camera, upload, annotate</Text>
          </Pressable>
          <Pressable style={[styles.tile, styles.b]} onPress={() => Alert.alert('RoomPlan', 'LiDAR requires a Dev Client. We’ll wire this next.')}>
            <Text style={styles.tileH}>LiDAR</Text>
            <Text style={styles.tileP}>RoomPlan scan + measurements</Text>
          </Pressable>
          <Pressable style={[styles.tile, styles.c]} onPress={() => Alert.alert('Document', 'PDF → FNOL coming next.')}>
            <Text style={styles.tileH}>Document</Text>
            <Text style={styles.tileP}>Upload PDF → FNOL</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.loading}><ActivityIndicator /></View>
          ) : (
            <FlatList
              contentContainerStyle={styles.gallery}
              numColumns={2}
              data={items}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <Pressable style={styles.card} onPress={() => router.push(`/photo/${item.id}`)}>
                  {item.storage_path ? (
                    <Image source={{ uri: `https://lyppkkpawalcchbgbkxg.supabase.co/storage/v1/object/public/${item.storage_path}` }} style={styles.thumb} />
                  ) : item.thumb_uri ? (
                    <Image source={{ uri: item.thumb_uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#9AA0A6' }}>Photo</Text></View>
                  )}
                  <View style={styles.row}>
                    <Text style={styles.label}>{item.label ?? (item.type === 'photo' ? 'Photo' : 'Room')}</Text>
                    <View style={[styles.badge, (item.status !== 'done' && item.status !== 'uploaded') && { backgroundColor: colors.sand }]}>
                      <Text style={styles.badgeText}>
                        {item.type === 'photo' ? `${item.anno_count ?? 0} • ` : ''}
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={<View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: colors.core }}>No media yet. Take your first photo.</Text></View>}
              refreshing={loading}
              onRefresh={loadGallery}
            />
          )}
        </View>
      )}

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={async (localUri) => {
          // optimistic card
          const tempId = uuidv4();
          setItems(prev => [{
            id: tempId, created_at: new Date().toISOString(),
            user_id: null, org_id: null, claim_id: null, type: 'photo',
            status: 'uploading', label: 'Photo', storage_path: null, anno_count: 0, qc: null, thumb_uri: localUri
          }, ...prev]);

          try {
            const fileName = `${uuidv4()}.jpg`;
            const path = `media/${fileName}`;
            await uploadPhotoToStorage(localUri, path);

            // Insert DB row as 'uploaded' then immediately mark 'annotating'
            const row = await insertMediaRow({
              claim_id: null, type: 'photo', status: 'annotating', label: 'Photo', storage_path: path, anno_count: 0, qc: null
            });

            // Replace optimistic with DB row (show local thumb)
            setItems(prev => [ { ...row, thumb_uri: localUri }, ...prev.filter(x => x.id !== tempId) ]);

            // Kick off annotation (edge function)
            invokeAnnotation(row.id, path).then(async () => {
              // Refresh the one row (simpler: just reload list)
              await loadGallery();
            }).catch(err => {
              console.error('annotate failed', err?.message ?? err);
              Alert.alert('Annotation failed', String(err?.message ?? err));
            });
          } catch (e: any) {
            console.error('upload/insert failed', e?.message ?? e);
            Alert.alert('Upload failed', String(e?.message ?? e));
            setItems(prev => prev.map(x => x.id === tempId ? { ...x, status: 'error' } : x));
          }
        }}
      />
    </View>
  );
}

function CameraModal({
  open, onClose, onCaptured
}: { open: boolean; onClose: () => void; onCaptured: (uri: string) => void }) {
  const cameraRef = useRef<CameraLib.CameraView>(null);
  const [ready, setReady] = useState(false);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <CameraLib.CameraView ref={cameraRef as any} style={{ flex: 1 }} facing="back" onCameraReady={() => setReady(true)} />
        <View style={styles.camBar}>
          <Pressable style={styles.camBtn} onPress={onClose}><Text style={styles.camBtnText}>Close</Text></Pressable>
          <Pressable style={[styles.captureButton, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={async () => {
            try {
              const cam = cameraRef.current as any;
              const pic = await cam.takePictureAsync?.({ quality: 0.85, skipProcessing: true });
              if (!pic?.uri) throw new Error('No image captured');
              const dest = FileSystem.cacheDirectory! + `photo_${Date.now()}.jpg`;
              await FileSystem.copyAsync({ from: pic.uri, to: dest });
              onCaptured(dest);
              onClose();
            } catch (e: any) { Alert.alert('Camera error', String(e?.message ?? e)); }
          }}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={{ width: 80 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  segment: { flexDirection: 'row', backgroundColor: colors.white, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segActive: { backgroundColor: colors.primary + '22' },
  segText: { color: colors.core, fontWeight: '600' },
  segTextActive: { color: colors.primary },

  grid: { padding: 16, gap: 12 },
  tile: { borderRadius: 18, padding: 18, height: 120, justifyContent: 'flex-end' },
  tileH: { color: colors.white, fontWeight: '700', fontSize: 18 },
  tileP: { color: colors.white, opacity: 0.9, marginTop: 2 },
  a: { backgroundColor: colors.primary }, b: { backgroundColor: colors.secondary }, c: { backgroundColor: colors.gold },

  gallery: { padding: 12, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 8, margin: 6, flex: 1, borderWidth: 1, borderColor: colors.line },
  thumb: { height: 120, borderRadius: 8, marginBottom: 8, width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.core, fontWeight: '600' },
  badge: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: colors.core, fontSize: 12, fontWeight: '700' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  camBar: { position: 'absolute', bottom: 28, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, alignItems: 'center' },
  camBtn: { width: 80, height: 44, borderRadius: 10, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  camBtnText: { color: '#fff', fontWeight: '600' },
  captureButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: '#ffffffaa', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' }
});
