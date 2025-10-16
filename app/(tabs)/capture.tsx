import 'react-native-get-random-values';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as CameraLib from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { colors } from '@/theme/colors';
import Header from '@/components/Header';
import { insertMediaRow, listMedia, uploadPhotoToStorage, MediaItem, batchAssignToClaim, getPublicUrl } from '@/services/media';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import { invokeAnnotation } from '@/services/annotate';
import { getOrCreateClaimByNumber, listClaimsLike } from '@/services/claims';

type GridItem = MediaItem & { thumb_uri?: string };

type TypeFilter = 'all' | 'photo' | 'lidar_room';
type StatusFilter = 'all' | 'uploading' | 'annotating' | 'done' | 'error';

export default function CaptureScreen() {
  const [mode, setMode] = useState<'capture' | 'gallery'>('capture');
  const [items, setItems] = useState<GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = CameraLib.useCameraPermissions();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [claimPickerOpen, setClaimPickerOpen] = useState(false);
  const [claimQuery, setClaimQuery] = useState('');
  const [claimResults, setClaimResults] = useState<{ id: string; claim_number: string | null }[]>([]);

  const router = useRouter();

  async function loadGallery() {
    try {
      setLoading(true);
      // Check if Supabase is configured
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_API_KEY) {
        console.error('Supabase not configured - cannot load media');
        setItems([]);
        return;
      }
      const rows = await listMedia(200);
      setItems(rows);
    } catch (e: any) {
      console.error('loadGallery error', e?.message ?? e);
      // If it's a Supabase configuration error, just set empty items
      if (e?.message?.includes('Supabase is not configured')) {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGallery();
  }, []);

  useEffect(() => {
    if (!claimPickerOpen) return;
    const t = setTimeout(async () => {
      const res = await listClaimsLike(claimQuery || '', 15);
      setClaimResults(res);
    }, 250);
    return () => clearTimeout(t);
  }, [claimPickerOpen, claimQuery]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      const tOk = typeFilter === 'all' ? true : i.type === typeFilter;
      const sOk = statusFilter === 'all' ? true : i.status === statusFilter;
      return tOk && sOk;
    });
  }, [items, typeFilter, statusFilter]);

  const onOpenCamera = async () => {
    const { granted } = permission ?? {};
    if (!granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setCameraOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelecting(false);
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
          <Pressable style={[styles.tile, styles.b]} onPress={() => {
            if (selected.size > 0) {
              const selectedArray = Array.from(selected);
              const firstMedia = items.find(i => i.id === selectedArray[0]);
              const claimId = firstMedia?.claim_id;
              router.push(claimId ? `/lidar/scan?claimId=${claimId}` : '/lidar/scan');
            } else {
              router.push('/lidar/scan');
            }
          }}>
            <Text style={styles.tileH}>LiDAR</Text>
            <Text style={styles.tileP}>3D Room Scan</Text>
          </Pressable>
          <Pressable style={[styles.tile, styles.c]} onPress={() => router.push('/document/upload')}>
            <Text style={styles.tileH}>Document</Text>
            <Text style={styles.tileP}>Upload PDF → FNOL</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Filters + toolbar */}
          <View style={styles.filters}>
            <View style={styles.filterRow}>
              <Pressable onPress={() => setTypeFilter('all')} style={[styles.chip, typeFilter==='all' && styles.chipActive]}><Text style={[styles.chipTxt, typeFilter==='all' && styles.chipTxtActive]}>All</Text></Pressable>
              <Pressable onPress={() => setTypeFilter('photo')} style={[styles.chip, typeFilter==='photo' && styles.chipActive]}><Text style={[styles.chipTxt, typeFilter==='photo' && styles.chipTxtActive]}>Photo</Text></Pressable>
              <Pressable onPress={() => setTypeFilter('lidar_room')} style={[styles.chip, typeFilter==='lidar_room' && styles.chipActive]}><Text style={[styles.chipTxt, typeFilter==='lidar_room' && styles.chipTxtActive]}>LiDAR</Text></Pressable>
            </View>
            <View style={styles.filterRow}>
              <Pressable onPress={() => setStatusFilter('all')} style={[styles.chip, statusFilter==='all' && styles.chipActive]}><Text style={[styles.chipTxt, statusFilter==='all' && styles.chipTxtActive]}>Any</Text></Pressable>
              <Pressable onPress={() => setStatusFilter('annotating')} style={[styles.chip, statusFilter==='annotating' && styles.chipActive]}><Text style={[styles.chipTxt, statusFilter==='annotating' && styles.chipTxtActive]}>Annotating</Text></Pressable>
              <Pressable onPress={() => setStatusFilter('done')} style={[styles.chip, statusFilter==='done' && styles.chipActive]}><Text style={[styles.chipTxt, statusFilter==='done' && styles.chipTxtActive]}>Done</Text></Pressable>
              <Pressable onPress={() => setStatusFilter('error')} style={[styles.chip, statusFilter==='error' && styles.chipActive]}><Text style={[styles.chipTxt, statusFilter==='error' && styles.chipTxtActive]}>Error</Text></Pressable>
            </View>
            <View style={styles.toolbar}>
              {!selecting ? (
                <Pressable onPress={() => setSelecting(true)} style={styles.toolBtn}><Text style={styles.toolTxt}>Select</Text></Pressable>
              ) : (
                <>
                  <Text style={styles.selCount}>{selected.size} selected</Text>
                  <Pressable onPress={() => setClaimPickerOpen(true)} disabled={!selected.size} style={[styles.toolBtn, !selected.size && styles.toolBtnDisabled]}>
                    <Text style={styles.toolTxt}>Assign to Claim</Text>
                  </Pressable>
                  <Pressable onPress={clearSelection} style={styles.toolBtnAlt}><Text style={styles.toolTxtAlt}>Clear</Text></Pressable>
                </>
              )}
            </View>
          </View>

          {loading ? (
            <View style={styles.loading}><ActivityIndicator /></View>
          ) : (
            <FlatList
              contentContainerStyle={styles.gallery}
              numColumns={2}
              data={filtered}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.card, selecting && styles.cardSel]}
                  onLongPress={() => { setSelecting(true); toggleSelect(item.id); }}
                  onPress={() => selecting ? toggleSelect(item.id) : router.push(`/photo/${item.id}`)}
                >
                  <View style={[styles.check, selected.has(item.id) && styles.checkOn]}>{selected.has(item.id) ? <Text style={styles.checkTxt}>✓</Text> : null}</View>
                  {item.storage_path ? (
                    <Image source={{ uri: getPublicUrl(item.storage_path)! }} style={styles.thumb} />
                  ) : item.thumb_uri ? (
                    <Image source={{ uri: item.thumb_uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#9AA0A6' }}>{item.type === 'photo' ? 'Photo' : 'Room'}</Text></View>
                  )}
                  <View style={styles.row}>
                    <Text style={styles.label}>{item.label ?? (item.type === 'photo' ? 'Photo' : 'Room')}</Text>
                    <View style={[styles.badge, (item.status !== 'done' && item.status !== 'uploaded') && { backgroundColor: colors.sand }]}>
                      <Text style={styles.badgeText}>{item.type === 'photo' ? `${item.anno_count ?? 0} • ` : ''}{item.status}</Text>
                    </View>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  {!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_API_KEY ? (
                    <>
                      <Text style={{ color: '#C53030', fontWeight: '600', marginBottom: 8 }}>⚠️ Supabase not configured</Text>
                      <Text style={{ color: '#742A2A', textAlign: 'center', fontSize: 12 }}>
                        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY to your .env file to enable photo storage
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: colors.core }}>No media yet. Take your first photo.</Text>
                  )}
                </View>
              }
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
            const row = await insertMediaRow({ claim_id: null, type: 'photo', status: 'annotating', label: 'Photo', storage_path: path, anno_count: 0, qc: null });
            setItems(prev => [ { ...row, thumb_uri: localUri }, ...prev.filter(x => x.id !== tempId) ]);
            invokeAnnotation(row.id, path).then(loadGallery).catch(err => Alert.alert('Annotation failed', String(err?.message ?? err)));
          } catch (e: any) {
            Alert.alert('Upload failed', String(e?.message ?? e));
            setItems(prev => prev.map(x => x.id === tempId ? { ...x, status: 'error' } : x));
          }
        }}
      />

      <ClaimPicker
        open={claimPickerOpen}
        onClose={() => setClaimPickerOpen(false)}
        query={claimQuery}
        onQuery={setClaimQuery}
        results={claimResults}
        onPick={async (claim_number) => {
          try {
            const claim = await getOrCreateClaimByNumber(claim_number);
            await batchAssignToClaim(Array.from(selected), claim.id);
            setClaimPickerOpen(false);
            clearSelection();
            await loadGallery();
          } catch (e: any) {
            Alert.alert('Assign failed', String(e?.message ?? e));
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

function ClaimPicker({
  open, onClose, query, onQuery, results, onPick
}: {
  open: boolean; onClose: () => void;
  query: string; onQuery: (s: string) => void;
  results: { id: string; claim_number: string | null }[];
  onPick: (claim_number: string) => void;
}) {
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
        <Header title="Assign to Claim" subtitle="Search or create claim number" />
        <View style={{ paddingHorizontal: 16 }}>
          <TextInput placeholder="Search or type a claim number..." placeholderTextColor="#9AA0A6" value={query} onChangeText={onQuery} style={styles.input} />
          <Pressable style={[styles.link, { marginTop: 8 }]} onPress={() => onPick(query.trim())}><Text style={styles.linkTxt}>Use “{query || 'new claim'}”</Text></Pressable>
        </View>
        <FlatList
          data={results}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Pressable style={styles.claimItem} onPress={() => onPick(item.claim_number ?? '')}>
              <Text style={styles.claimTxt}>{item.claim_number ?? '(unnamed)'}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<View style={{ padding: 16 }}><Text style={{ color: colors.core }}>No results</Text></View>}
        />
        <View style={{ padding: 16 }}>
          <Pressable style={[styles.link, { backgroundColor: colors.gold }]} onPress={onClose}><Text style={[styles.linkTxt, { color: colors.core }]}>Close</Text></Pressable>
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

  filters: { padding: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.light },
  chipTxt: { color: colors.core, fontWeight: '600' },
  chipTxtActive: { color: colors.core },

  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  toolBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  toolBtnDisabled: { opacity: 0.5 },
  toolTxt: { color: colors.white, fontWeight: '700' },
  toolBtnAlt: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  toolTxtAlt: { color: colors.core, fontWeight: '700' },
  selCount: { color: colors.core, fontWeight: '700' },

  gallery: { paddingHorizontal: 8, paddingBottom: 16 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 8, margin: 8, flex: 1, borderWidth: 1, borderColor: colors.line },
  cardSel: { borderColor: colors.primary, borderWidth: 2 },
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
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },

  check: { position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.white, backgroundColor: '#00000055', zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary },
  checkTxt: { color: '#fff', fontWeight: '800' },

  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, color: colors.core, marginTop: 6 },
  link: { backgroundColor: colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
  linkTxt: { color: colors.white, fontWeight: '700' },
  claimItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  claimTxt: { color: colors.core, fontWeight: '600' }
});
