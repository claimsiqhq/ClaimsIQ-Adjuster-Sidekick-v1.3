// app/document/[id].tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { getDocument, triggerFNOLExtraction, deleteDocument, Document } from '@/services/documents';
import { FNOLData } from '@/services/fnol';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  async function loadDocument() {
    if (!id) return;
    
    try {
      setLoading(true);
      const doc = await getDocument(id);
      setDocument(doc);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract() {
    if (!id) return;
    
    try {
      setProcessing(true);
      await triggerFNOLExtraction(id, document?.claim_id || undefined);
      Alert.alert('Success', 'FNOL data extracted successfully!');
      loadDocument(); // Reload to see extraction results
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    
    Alert.alert(
      'Delete Document',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(id);
              Alert.alert('Success', 'Document deleted');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Document not found</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const fnolData = document.extracted_data as FNOLData | null;

  return (
    <ScrollView style={styles.container}>
      <Header title={document.file_name} subtitle={`Type: ${document.document_type}`} />

      <Section title="Document Information">
        <InfoRow label="Type" value={document.document_type} />
        <InfoRow label="File Size" value={formatBytes(document.file_size_bytes || 0)} />
        <InfoRow label="Uploaded" value={new Date(document.created_at).toLocaleDateString()} />
        <InfoRow label="MIME Type" value={document.mime_type || 'Unknown'} />
      </Section>

      {document.document_type === 'fnol' && (
        <>
          <Section title="Extraction Status">
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Status:</Text>
              <View style={[styles.statusBadge, getStatusColor(document.extraction_status)]}>
                <Text style={styles.statusText}>{document.extraction_status}</Text>
              </View>
            </View>

            {document.extraction_error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Error:</Text>
                <Text style={styles.errorText}>{document.extraction_error}</Text>
              </View>
            )}

            {document.extraction_status === 'pending' && (
              <Pressable
                style={[styles.button, processing && styles.buttonDisabled]}
                onPress={handleExtract}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Extract FNOL Data</Text>
                )}
              </Pressable>
            )}

            {document.extraction_status === 'error' && (
              <Pressable style={styles.button} onPress={handleExtract}>
                <Text style={styles.buttonText}>Retry Extraction</Text>
              </Pressable>
            )}
          </Section>

          {fnolData && document.extraction_status === 'completed' && (
            <>
              <Section title="Policy Information">
                <InfoRow label="Claim Number" value={fnolData.policyDetails?.claimNumber} />
                <InfoRow label="Policy Number" value={fnolData.policyDetails?.policyNumber} />
                <InfoRow label="Carrier" value={fnolData.carrierName} />
                <InfoRow label="Policy Period" value={fnolData.policyDetails?.policyPeriod} />
              </Section>

              <Section title="Insured Information">
                <InfoRow label="Name" value={fnolData.policyHolder?.insuredName} />
                <InfoRow label="Address" value={fnolData.policyHolder?.insuredAddress} />
              </Section>

              <Section title="Loss Details">
                <InfoRow label="Loss Type" value={fnolData.lossDetails?.claimType} />
                <InfoRow label="Cause" value={fnolData.lossDetails?.causeOfLoss} />
                <InfoRow label="Date" value={fnolData.lossDetails?.dateOfLoss} />
                <InfoRow label="Time" value={fnolData.lossDetails?.timeOfLoss} />
                <InfoRow label="Location" value={fnolData.lossDetails?.lossLocation} />
                <InfoRow label="Description" value={fnolData.lossDetails?.lossDescription} />
                <InfoRow label="Estimated Loss" value={fnolData.lossDetails?.estimatedLoss} />
              </Section>

              <Section title="Adjuster Information">
                <InfoRow label="Assigned" value={fnolData.adjustor?.adjustorAssigned} />
                <InfoRow label="Email" value={fnolData.adjustor?.adjustorEmail} />
                <InfoRow label="Phone" value={fnolData.adjustor?.adjustorPhoneNumber} />
              </Section>

              <Section title="Reporter Information">
                <InfoRow label="Name" value={fnolData.reporterInfo?.reportersName} />
                <InfoRow label="Type" value={fnolData.reporterInfo?.callerType} />
                <InfoRow label="Cell Phone" value={fnolData.reporterInfo?.callerCellPhone} />
                <InfoRow label="Email" value={fnolData.reporterInfo?.callerEmailAddress} />
              </Section>
            </>
          )}
        </>
      )}

      <Section title="Actions">
        <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Delete Document</Text>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return { backgroundColor: '#10B981' };
    case 'processing': return { backgroundColor: '#F59E0B' };
    case 'error': return { backgroundColor: '#EF4444' };
    default: return { backgroundColor: '#6B7280' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.core,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: '#5F6771',
    flex: 2,
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.gold,
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextDark: {
    color: colors.core,
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});

