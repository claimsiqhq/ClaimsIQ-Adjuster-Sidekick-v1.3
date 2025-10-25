// Improved Capture Screen with Better UX
// Replace capture.tsx with this file

import 'react-native-get-random-values';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import * as CameraLib from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { textStyles } from '@/theme/typography';
import Header from '@/components/Header';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SearchBar from '@/components/ui/SearchBar';
import EmptyState from '@/components/ui/EmptyState';
import {
  insertMediaRow,
  listMedia,
  uploadPhotoToStorage,
  MediaItem,
  batchAssignToClaim,
  getPublicUrl,
} from '@/services/media';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import { invokeAnnotation } from '@/services/annotate';
import { getOrCreateClaimByNumber, listClaimsLike } from '@/services/claims';
import { getSession } from '@/services/auth';
import { supabase } from '@/utils/supabase';
import { smartCompress } from '@/utils/imageCompression';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [claimPickerOpen, setClaimPickerOpen] = useState(false);
  const [claimQuery, setClaimQuery] = useState('');
  const [claimResults, setClaimResults] = useState<
    { id: string; claim_number: string | null }[]
  >([]);

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

  // Filter and search
  const filtered = useMemo(() => {
    return items.filter((i) => {
      // Type filter
      const tOk = typeFilter === 'all' ? true : i.type === typeFilter;
      // Status filter
      const sOk = statusFilter === 'all' ? true : i.status === statusFilter;
      // Search filter
      const qOk = searchQuery
        ? i.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.storage_path?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return tOk && sOk && qOk;
    });
  }, [items, typeFilter, statusFilter, searchQuery]);

  const onOpenCamera = async () => {
    const { granted } = permission ?? {};
    if (!granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setCameraOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelecting(false);
  };

  const selectAll = () => {
    setSelected(new Set(filtered.map((i) => i.id)));
  };

  const getStatusBadge = (item: GridItem) => {
    if (item.status === 'uploading') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.info }]}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      );
    }
    if (item.status === 'annotating') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      );
    }
    if (item.status === 'done' && item.anno_count) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.white} />
          <Text style={styles.statusText}>{item.anno_count}</Text>
        </View>
      );
    }
    if (item.status === 'error') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.error }]}>
          <Ionicons name="alert-circle" size={16} color={colors.white} />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Media" subtitle="Capture and manage photos" />

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setMode('capture')}
          style={[styles.segmentButton, mode === 'capture' && styles.segmentButtonActive]}
        >
          <Ionicons
            name="camera"
            size={20}
            color={mode === 'capture' ? colors.primary : colors.textLight}
          />
          <Text
            style={[
              styles.segmentText,
              mode === 'capture' && styles.segmentTextActive,
            ]}
          >
            Capture
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('gallery')}
          style={[styles.segmentButton, mode === 'gallery' && styles.segmentButtonActive]}
        >
          <Ionicons
            name="images"
            size={20}
            color={mode === 'gallery' ? colors.primary : colors.textLight}
          />
          <Text
            style={[
              styles.segmentText,
              mode === 'gallery' && styles.segmentTextActive,
            ]}
          >
            Gallery ({items.length})
          </Text>
        </Pressable>
      </View>

      {mode === 'capture' ? (
        <View style={styles.captureContent}>
          <Card style={styles.captureCard}>
            <Pressable style={styles.captureOption} onPress={onOpenCamera}>
              <View style={[styles.captureIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="camera" size={32} color={colors.primary} />
              </View>
              <View style={styles.captureInfo}>
                <Text style={styles.captureTitle}>Photo Capture</Text>
                <Text style={styles.captureDescription}>
                  Take photos for AI-powered damage annotation
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
            </Pressable>
          </Card>

          <Card style={styles.captureCard}>
            <Pressable
              style={styles.captureOption}
              onPress={() => {
                if (selected.size > 0) {
                  const selectedArray = Array.from(selected);
                  const firstMedia = items.find((i) => i.id === selectedArray[0]);
                  const claimId = firstMedia?.claim_id;
                  router.push(
                    claimId ? `/lidar/scan?claimId=${claimId}` : '/lidar/scan'
                  );
                } else {
                  router.push('/lidar/scan');
                }
              }}
            >
              <View style={[styles.captureIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="scan" size={32} color={colors.secondary} />
              </View>
              <View style={styles.captureInfo}>
                <Text style={styles.captureTitle}>LiDAR Scan</Text>
                <Text style={styles.captureDescription}>
                  3D room scanning (experimental)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
            </Pressable>
          </Card>

          <View style={styles.captureHint}>
            <Ionicons name="information-circle-outline" size={20} color={colors.info} />
            <Text style={styles.captureHintText}>
              Photos are automatically processed with AI to detect and annotate damage
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.galleryContent}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search photos..."
            />
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type</Text>
              <View style={styles.filterChips}>
                <Pressable
                  onPress={() => setTypeFilter('all')}
                  style={[styles.chip, typeFilter === 'all' && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, typeFilter === 'all' && styles.chipTextActive]}
                  >
                    All
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTypeFilter('photo')}
                  style={[styles.chip, typeFilter === 'photo' && styles.chipActive]}
                >
                  <Ionicons
                    name="camera"
                    size={14}
                    color={typeFilter === 'photo' ? colors.white : colors.textLight}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      typeFilter === 'photo' && styles.chipTextActive,
                    ]}
                  >
                    Photos
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTypeFilter('lidar_room')}
                  style={[styles.chip, typeFilter === 'lidar_room' && styles.chipActive]}
                >
                  <Ionicons
                    name="scan"
                    size={14}
                    color={typeFilter === 'lidar_room' ? colors.white : colors.textLight}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      typeFilter === 'lidar_room' && styles.chipTextActive,
                    ]}
                  >
                    LiDAR
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterChips}>
                <Pressable
                  onPress={() => setStatusFilter('all')}
                  style={[styles.chip, statusFilter === 'all' && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      statusFilter === 'all' && styles.chipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setStatusFilter('annotating')}
                  style={[
                    styles.chip,
                    statusFilter === 'annotating' && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      statusFilter === 'annotating' && styles.chipTextActive,
                    ]}
                  >
                    Processing
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setStatusFilter('done')}
                  style={[styles.chip, statusFilter === 'done' && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      statusFilter === 'done' && styles.chipTextActive,
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setStatusFilter('error')}
                  style={[styles.chip, statusFilter === 'error' && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      statusFilter === 'error' && styles.chipTextActive,
                    ]}
                  >
                    Error
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Action Bar */}
          {!selecting && items.length > 0 && (
            <View style={styles.actionBar}>
              <Button
                title="Select"
                onPress={() => setSelecting(true)}
                variant="outline"
                size="small"
                icon="checkbox-outline"
              />
              <Text style={styles.resultCount}>{filtered.length} photos</Text>
            </View>
          )}

          {/* Gallery Grid */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading photos...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              numColumns={3}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.gridContainer}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.gridItem,
                    selecting && selected.has(item.id) && styles.gridItemSelected,
                  ]}
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
                      source={{
                        uri: item.thumb_uri || getPublicUrl(item.storage_path) || undefined,
                      }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                      <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                    </View>
                  )}

                  {/* Status Badge */}
                  {getStatusBadge(item)}

                  {/* Selection Overlay */}
                  {selecting && (
                    <View
                      style={[
                        styles.selectOverlay,
                        selected.has(item.id) && styles.selectOverlayActive,
                      ]}
                    >
                      {selected.has(item.id) && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={32} color={colors.white} />
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="camera-outline"
                  title="No Photos Yet"
                  message={
                    searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                      ? 'No photos match your filters'
                      : 'Start capturing photos to begin'
                  }
                  actionLabel={
                    searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                      ? 'Clear Filters'
                      : 'Open Camera'
                  }
                  onAction={() => {
                    if (searchQuery || typeFilter !== 'all' || statusFilter !== 'all') {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setStatusFilter('all');
                    } else {
                      setMode('capture');
                    }
                  }}
                />
              }
            />
          )}
        </View>
      )}

      {/* Selection Bar */}
      {selecting && selected.size > 0 && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionInfo}>
            <Ionicons name="checkmark-circle" size={24} color={colors.white} />
            <Text style={styles.selectionText}>{selected.size} selected</Text>
          </View>
          <View style={styles.selectionActions}>
            <Pressable style={styles.selectionButton} onPress={selectAll}>
              <Text style={styles.selectionButtonText}>All</Text>
            </Pressable>
            <Pressable style={styles.selectionButton} onPress={() => setClaimPickerOpen(true)}>
              <Ionicons name="folder-outline" size={18} color={colors.white} />
              <Text style={styles.selectionButtonText}>Assign</Text>
            </Pressable>
            <Pressable
              style={[styles.selectionButton, { backgroundColor: colors.error }]}
              onPress={async () => {
                Alert.alert(
                  'Delete Photos',
                  `Delete ${selected.size} photo${selected.size > 1 ? 's' : ''}? This cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { error } = await supabase
                            .from('media')
                            .delete()
                            .in('id', Array.from(selected));

                          if (error) throw error;

                          setItems((prev) => prev.filter((item) => !selected.has(item.id)));
                          clearSelection();
                          Alert.alert(
                            'Success',
                            `Deleted ${selected.size} photo${selected.size > 1 ? 's' : ''}`
                          );
                        } catch (error: any) {
                          Alert.alert(
                            'Delete Failed',
                            error.message || 'Failed to delete photos'
                          );
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={styles.selectionButtonText}>Delete</Text>
            </Pressable>
            <Pressable style={styles.selectionButton} onPress={clearSelection}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>
      )}

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={(localUri) => {
          setCameraOpen(false);
          const tempId = uuidv4();
          setItems((prev) => [
            {
              id: tempId,
              created_at: new Date().toISOString(),
              user_id: null,
              org_id: null,
              claim_id: null,
              type: 'photo',
              status: 'uploading',
              label: 'Photo',
              storage_path: null,
              anno_count: 0,
              qc: null,
              thumb_uri: localUri,
            },
            ...prev,
          ]);

          (async () => {
            try {
              const session = await getSession();
              if (!session?.user?.id) {
                throw new Error('No user session found. Please log in again.');
              }

              // Compress image before upload
              const compressed = await smartCompress(localUri);
              console.log(
                `Image compressed: ${compressed.originalSize} -> ${compressed.compressedSize} bytes (${compressed.compressionRatio}% reduction)`
              );

              const fileName = `${uuidv4()}.jpg`;
              const path = `media/${fileName}`;

              // Upload compressed image
              await uploadPhotoToStorage(compressed.uri, path);

              const row = await insertMediaRow({
                user_id: session.user.id,
                claim_id: null,
                type: 'photo',
                status: 'pending',
                label: 'Photo',
                storage_path: path,
                anno_count: 0,
                qc: null,
              });

              setItems((prev) => [
                { ...row, thumb_uri: localUri },
                ...prev.filter((x) => x.id !== tempId),
              ]);

              invokeAnnotation(row.id, path)
                .then(() => {
                  setItems((prev) =>
                    prev.map((x) => (x.id === row.id ? { ...x, status: 'annotating' } : x))
                  );
                  return loadGallery();
                })
                .catch((err) => {
                  console.log('Annotation service not available:', err);
                });
            } catch (e: any) {
              Alert.alert('Upload failed', String(e?.message ?? e));
              setItems((prev) =>
                prev.map((x) => (x.id === tempId ? { ...x, status: 'error' } : x))
              );
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
    </SafeAreaView>
  );
}

function CameraModal({
  open,
  onClose,
  onCaptured,
}: {
  open: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
}) {
  const cameraRef = useRef<CameraLib.CameraView>(null);
  const [ready, setReady] = useState(false);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cameraContainer}>
        <CameraLib.CameraView
          ref={cameraRef as any}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setReady(true)}
        />
        <View style={styles.cameraControls}>
          <Button
            title="Close"
            onPress={onClose}
            variant="ghost"
            size="medium"
            style={styles.cameraButton}
          />
          <Pressable
            style={[styles.captureButton, !ready && styles.captureButtonDisabled]}
            disabled={!ready}
            onPress={async () => {
              try {
                const cam = cameraRef.current as any;
                const pic = await cam.takePictureAsync?.({
                  quality: 0.85,
                  skipProcessing: true,
                });
                if (!pic?.uri) throw new Error('No image captured');

                const destFileName = `photo_${Date.now()}.jpg`;
                const sourceFile = new File(pic.uri);
                const destFile = new File(Paths.cache, destFileName);
                await sourceFile.copy(destFile);

                onCaptured(destFile.uri);
                onClose();
              } catch (e: any) {
                Alert.alert('Camera error', String(e?.message ?? e));
              }
            }}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={{ width: 80 }} />
        </View>
      </View>
    </Modal>
  );
}

function ClaimPicker({
  open,
  onClose,
  query,
  onQuery,
  results,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  onQuery: (s: string) => void;
  results: { id: string; claim_number: string | null }[];
  onPick: (claim_number: string) => void;
}) {
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <Header title="Assign to Claim" subtitle="Search or create claim" />
        <View style={styles.modalContent}>
          <SearchBar
            value={query}
            onChangeText={onQuery}
            placeholder="Search or type claim number..."
            autoFocus={true}
          />
          {query.trim() && (
            <Card style={styles.createCard}>
              <Pressable style={styles.createOption} onPress={() => onPick(query.trim())}>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                <Text style={styles.createText}>
                  Use "{query.trim()}" {results.length === 0 && '(new claim)'}
                </Text>
              </Pressable>
            </Card>
          )}
          <FlatList
            data={results}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.resultsContainer}
            renderItem={({ item }) => (
              <Card style={styles.resultCard}>
                <Pressable
                  style={styles.resultOption}
                  onPress={() => onPick(item.claim_number ?? '')}
                >
                  <Ionicons name="folder-outline" size={20} color={colors.textLight} />
                  <Text style={styles.resultText}>{item.claim_number ?? '(unnamed)'}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </Pressable>
              </Card>
            )}
            ListEmptyComponent={
              query ? (
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyText}>No matching claims</Text>
                </View>
              ) : (
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyText}>Type to search claims</Text>
                </View>
              )
            }
          />
          <View style={styles.modalFooter}>
            <Button title="Cancel" onPress={onClose} variant="outline" fullWidth />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  segmentText: {
    ...textStyles.body,
    color: colors.textLight,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.primary,
  },

  // Capture Mode
  captureContent: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  captureCard: {
    marginBottom: spacing.md,
  },
  captureOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  captureIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInfo: {
    flex: 1,
  },
  captureTitle: {
    ...textStyles.h4,
    marginBottom: spacing.xs,
  },
  captureDescription: {
    ...textStyles.bodySmall,
  },
  captureHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  captureHintText: {
    ...textStyles.bodySmall,
    flex: 1,
    color: colors.info,
  },

  // Gallery Mode
  galleryContent: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    ...textStyles.label,
    marginBottom: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...textStyles.bodySmall,
    color: colors.textLight,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  resultCount: {
    ...textStyles.bodySmall,
    color: colors.textLight,
  },

  // Grid
  gridContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  gridItem: {
    width: '31.33%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
  },
  gridItemSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  statusText: {
    ...textStyles.caption,
    color: colors.white,
    fontWeight: '700',
  },
  selectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOverlayActive: {
    backgroundColor: colors.primary + '40',
  },
  checkmarkContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selection Bar
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectionText: {
    ...textStyles.body,
    color: colors.white,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  selectionButtonText: {
    ...textStyles.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },

  // Center Loading
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    ...textStyles.body,
    marginTop: spacing.md,
  },

  // Camera Modal
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraButton: {
    width: 80,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.white,
  },

  // Claim Picker Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  createCard: {
    marginVertical: spacing.md,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  createText: {
    ...textStyles.body,
    color: colors.primary,
    fontWeight: '600',
  },
  resultsContainer: {
    paddingBottom: spacing.xxxl,
  },
  resultCard: {
    marginBottom: spacing.sm,
  },
  resultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resultText: {
    ...textStyles.body,
    flex: 1,
  },
  emptyResults: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...textStyles.bodySmall,
  },
  modalFooter: {
    paddingVertical: spacing.md,
  },
});
