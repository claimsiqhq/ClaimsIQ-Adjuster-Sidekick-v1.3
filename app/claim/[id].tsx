// app/claim/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { colors } from '@/theme/colors';
import { supabase } from '@/utils/supabase';
import { listMedia, getPublicUrl, MediaItem } from '@/services/media';
import { listDocuments, Document } from '@/services/documents';
import Header from '@/components/Header';
import Section from '@/components/Section';

interface ClaimDetail {
  id: string;
  claim_number: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  insured_name: string | null;
  property_address: any;
  loss_date: string | null;
  loss_type: string | null;
}

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ClaimDetail>>({});

  useEffect(() => {
    loadClaimData();
  }, [id]);

  async function loadClaimData() {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Load claim details
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select('*')
        .eq('id', id)
        .single();
      
      if (claimError) throw claimError;
      setClaim(claimData);
      setEditData(claimData);
      
      // Load photos for this claim
      const claimPhotos = await listMedia(100, { claim_id: id });
      setPhotos(claimPhotos);

      // Load documents for this claim
      const claimDocs = await listDocuments(id);
      setDocuments(claimDocs);
    } catch (error: any) {
      console.error('Error loading claim:', error);
      Alert.alert('Error', 'Failed to load claim details');
    } finally {
      setLoading(false);
    }
  }

  async function saveClaim() {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('claims')
        .update({
          insured_name: editData.insured_name,
          loss_type: editData.loss_type,
          loss_date: editData.loss_date,
          status: editData.status,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Claim updated successfully');
      setEditing(false);
      loadClaimData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Claim not found</Text>
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Header 
        title={`Claim #${claim.claim_number || 'Unnamed'}`} 
        subtitle={`Status: ${claim.status || 'Open'}`}
      />

      {/* Claim Information */}
      <Section title="Claim Information">
        <View style={styles.infoRow}>
          <Text style={styles.label}>Claim Number:</Text>
          <Text style={styles.value}>{claim.claim_number || 'N/A'}</Text>
        </View>
        
        {editing ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Insured Name:</Text>
              <TextInput
                style={styles.input}
                value={editData.insured_name || ''}
                onChangeText={(text) => setEditData({ ...editData, insured_name: text })}
                placeholder="Enter insured name"
              />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Loss Type:</Text>
              <TextInput
                style={styles.input}
                value={editData.loss_type || ''}
                onChangeText={(text) => setEditData({ ...editData, loss_type: text })}
                placeholder="e.g., Water Damage, Fire"
              />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <TextInput
                style={styles.input}
                value={editData.status || ''}
                onChangeText={(text) => setEditData({ ...editData, status: text })}
                placeholder="open, in_progress, completed"
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Insured Name:</Text>
              <Text style={styles.value}>{claim.insured_name || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Loss Type:</Text>
              <Text style={styles.value}>{claim.loss_type || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Loss Date:</Text>
              <Text style={styles.value}>
                {claim.loss_date ? new Date(claim.loss_date).toLocaleDateString() : 'Not set'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>{new Date(claim.created_at).toLocaleDateString()}</Text>
            </View>
          </>
        )}
        
        <View style={styles.buttonRow}>
          {editing ? (
            <>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => setEditing(false)}>
                <Text style={styles.btnTextDark}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={saveClaim}>
                <Text style={styles.btnText}>Save Changes</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={[styles.btn, { flex: 0.6 }]} onPress={() => setEditing(true)}>
                <Text style={styles.btnText}>Edit</Text>
              </Pressable>
              <Pressable 
                style={[styles.btn, styles.btnSecondary, { flex: 1 }]} 
                onPress={() => router.push(`/report/${id}`)}
              >
                <Text style={styles.btnTextDark}>📄 Generate Report</Text>
              </Pressable>
            </>
          )}
        </View>
      </Section>

      {/* Documents Section */}
      <Section title={`Documents (${documents.length})`}>
        <Pressable
          style={styles.uploadButton}
          onPress={() => router.push(`/document/upload?claimId=${id}`)}
        >
          <Text style={styles.uploadButtonText}>📄 Upload Document</Text>
        </Pressable>

        {documents.length === 0 ? (
          <Text style={styles.emptyText}>
            No documents yet. Upload FNOL, estimates, or other claim documents.
          </Text>
        ) : (
          <View style={styles.documentList}>
            {documents.map((doc) => (
              <Pressable
                key={doc.id}
                style={styles.documentCard}
                onPress={() => router.push(`/document/${doc.id}`)}
              >
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {doc.file_name}
                  </Text>
                  <Text style={styles.documentType}>{doc.document_type}</Text>
                </View>
                <View style={[styles.docStatusBadge, getDocStatusColor(doc.extraction_status)]}>
                  <Text style={styles.docStatusText}>
                    {doc.extraction_status === 'completed' && doc.document_type === 'fnol' ? '✓' : '•'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      {/* Photos Section */}
      <Section title={`Photos (${photos.length})`}>
        {photos.length === 0 ? (
          <Text style={styles.emptyText}>No photos yet. Go to Capture tab to add photos to this claim.</Text>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((photo) => {
              const url = getPublicUrl(photo.storage_path);
              return (
                <Pressable
                  key={photo.id}
                  style={styles.photoCard}
                  onPress={() => router.push(`/photo/${photo.id}`)}
                >
                  {url ? (
                    <Image source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.photoThumb, { backgroundColor: colors.line }]} />
                  )}
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoLabel} numberOfLines={1}>
                      {photo.label || 'Untitled'}
                    </Text>
                    <Text style={styles.photoStatus}>{photo.status}</Text>
                  </View>
                  {photo.anno_count && photo.anno_count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{photo.anno_count} detections</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  errorText: {
    fontSize: 16,
    color: colors.core,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#5F6771',
    flex: 1,
    textAlign: 'right',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.core,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  btn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: colors.gold,
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  btnTextDark: {
    color: colors.core,
    fontWeight: '700',
    fontSize: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  photoCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  photoInfo: {
    padding: 8,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  photoStatus: {
    fontSize: 10,
    color: '#9AA0A6',
    textTransform: 'capitalize',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9AA0A6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  documentList: {
    paddingHorizontal: 16,
  },
  documentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  documentType: {
    fontSize: 11,
    color: '#9AA0A6',
    textTransform: 'uppercase',
  },
  docStatusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docStatusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

function getDocStatusColor(status: string) {
  switch (status) {
    case 'completed': return { backgroundColor: '#10B981' };
    case 'processing': return { backgroundColor: '#F59E0B' };
    case 'error': return { backgroundColor: '#EF4444' };
    default: return { backgroundColor: '#6B7280' };
  }
}

