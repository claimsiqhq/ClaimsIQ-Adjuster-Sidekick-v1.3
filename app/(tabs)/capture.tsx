import 'react-native-get-random-values';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Image, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as CameraLib from 'expo-camera';
import { File, Paths } from 'expo-file-system';
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
      const rows = await listMedia(200);
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
            <Text style={styles.tileH}>📸 Photo</Text>
            <Text style={styles.tileP}>Capture damage photos for AI annotation</Text>
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
            <Text style={styles.tileH}>🎯 LiDAR</Text>
            <Text style={styles.tileP}>3D room scanning (experimental)</Text>
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
          </View>

          {selecting && selected.size > 0 ? (
            <View style={styles.toolbar}>
              <Pressable style={styles.toolBtn} onPress={() => setClaimPickerOpen(true)}><Text style={styles.toolBtnTxt}>Assign to Claim</Text></Pressable>
              <Pressable style={[styles.toolBtn, { backgroundColor: colors.gold }]} onPress={clearSelection}><Text style={[styles.toolBtnTxt, { color: colors.core }]}>Cancel</Text></Pressable>
            </View>
          ) : (
            <View style={styles.toolbar}>
              <Pressable style={styles.toolBtn} onPress={() => { if (items.length > 0) setSelecting(true); }}><Text style={styles.toolBtnTxt}>Select</Text></Pressable>
            </View>
          )}

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filtered}
              numColumns={3}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.gridItem, selecting && selected.has(item.id) && styles.gridItemSelected]}
                  onPress={() => {
                    if (selecting) {
                      toggleSelect(item.id);
                    } else {
                      router.push(`/photo/${item.id}`);
                    }
                  }}
                  onLongPress={() => {
                    setSelecting(true);
                    toggleSelect(item.id);
                  }}
                >
                  {item.thumb_uri || getPublicUrl(item.storage_path) ? (
                    <Image
                      source={{ uri: item.thumb_uri || getPublicUrl(item.storage_path) || undefined }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: colors.line }]} />
                  )}
                  {item.status === 'annotating' && (
                    <View style={styles.statusBadge}><ActivityIndicator size="small" color={colors.white} /></View>
                  )}
                  {item.status === 'done' && item.anno_count ? (
                    <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.statusText}>{item.anno_count}</Text>
                    </View>
                  ) : null}
                  {selecting && (
                    <View style={styles.selectOverlay}>
                      {selected.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textLight }}>No photos yet. Tap camera to start.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCaptured={(localUri) => {
        setCameraOpen(false);
        const tempId = uuidv4();
        setItems(prev => [{
          id: tempId, created_at: new Date().toISOString(),
          user_id: null, org_id: null, claim_id: null, type: 'photo',
          status: 'uploading', label: 'Photo', storage_path: null, anno_count: 0, qc: null, thumb_uri: localUri
        }, ...prev]);

        (async () => {
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
        })();
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
              
              // Use new File API instead of deprecated copyAsync
              const destFileName = `photo_${Date.now()}.jpg`;
              const sourceFile = new File(pic.uri);
              const destFile = new File(Paths.cache, destFileName);
              await sourceFile.copy(destFile);
              
              onCaptured(destFile.uri);
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
          <Pressable style={[styles.link, { marginTop: 8 }]} onPress={() => onPick(query.trim())}><Text style={styles.linkTxt}>Use "{query || 'new claim'}"</Text></Pressable>
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
  segment: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line },
  segActive: { backgroundColor: colors.light, borderColor: colors.primary },
  segText: { color: colors.textLight, fontWeight: '600' },
  segTextActive: { color: colors.primary },
  grid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 10 },
  tile: { borderRadius: 18, padding: 18, height: 120, justifyContent: 'flex-end' },
  tileH: { color: colors.white, fontWeight: '700', fontSize: 18 },
  tileP: { color: colors.white, opacity: 0.9, marginTop: 2 },
  a: { backgroundColor: colors.primary }, b: { backgroundColor: colors.secondary }, c: { backgroundColor: colors.gold },

  filters: { paddingHorizontal: 16, paddingVertical: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { color: colors.core, fontSize: 13, fontWeight: '600' },
  chipTxtActive: { color: colors.white },

  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  toolBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  toolBtnTxt: { color: colors.white, fontWeight: '700' },

  gridItem: { width: '31%', aspectRatio: 1, margin: '1%', borderRadius: 8, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line },
  gridItemSelected: { borderColor: colors.primary, borderWidth: 3 },
  thumb: { width: '100%', height: '100%' },
  statusBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3 },
  statusText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  selectOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  checkmark: { fontSize: 40, color: colors.white },

  camBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  camBtn: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.gold, borderRadius: 12 },
  camBtnText: { color: colors.core, fontWeight: '700' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.white },

  input: { backgroundColor: colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.core },
  link: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  linkTxt: { color: colors.white, fontWeight: '700' },
  claimItem: { backgroundColor: colors.white, padding: 16, marginHorizontal: 16, marginVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  claimTxt: { color: colors.core, fontWeight: '600' },
});
