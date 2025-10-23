// app/document/upload.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '@/theme/colors';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { uploadDocument, triggerFNOLExtraction, DocumentType } from '@/services/documents';

export default function DocumentUploadScreen() {
  const router = useRouter();
  const { claimId } = useLocalSearchParams<{ claimId?: string }>();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>('fnol');

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'fnol', label: 'FNOL (First Notice of Loss)' },
    { value: 'estimate', label: 'Estimate' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'correspondence', label: 'Correspondence' },
    { value: 'report', label: 'Report' },
    { value: 'other', label: 'Other' },
  ];

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
        });
      }
    } catch (error: any) {
      console.error('[DocumentPicker] Error:', error);
      Alert.alert('Error', 'Failed to pick document: ' + error.message);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a document first');
      return;
    }

    try {
      setUploading(true);

      // Upload document with proper MIME type
      const document = await uploadDocument(
        selectedFile.uri,
        selectedFile.name,
        selectedType,
        claimId,
        selectedFile.type
      );

      Alert.alert('Success', 'Document uploaded successfully!');

      // If it's an FNOL, automatically extract data and populate claim
      if (selectedType === 'fnol') {
        setUploading(false);
        setProcessing(true);
        
        try {
          Alert.alert('Processing', 'Extracting claim data from FNOL...');
          
          // Extract data and create/update claim with all fields populated
          const result = await triggerFNOLExtraction(document.id, claimId);
          
          if (result?.claim) {
            const claim = result.claim;
            Alert.alert(
              'FNOL Processed Successfully!',
              `Claim ${claim.claim_number} has been created with:\n` +
              `• Policy #: ${claim.policy_number || 'Not found'}\n` +
              `• Insured: ${claim.insured_name || 'Not found'}\n` +
              `• Loss Date: ${claim.loss_date || 'Not found'}\n` +
              `• Adjuster: ${claim.adjuster_name || 'Not found'}\n\n` +
              'All available data from the FNOL has been extracted and saved.',
              [
                { 
                  text: 'View Claim', 
                  onPress: () => router.push(`/(tabs)/claims`)
                }
              ]
            );
          } else {
            Alert.alert('Success', 'FNOL uploaded and processed!');
            router.back();
          }
        } catch (error: any) {
          console.error('[FNOL] Extraction error:', error);
          
          // Show detailed error with deployment guidance
          if (error.message.includes('Edge function')) {
            Alert.alert(
              'Edge Functions Not Deployed',
              'The AI extraction feature requires deployed edge functions.\n\n' +
              'To enable this feature:\n' +
              '1. Install Supabase CLI\n' +
              '2. Link to your project\n' +
              '3. Set OPENAI_API_KEY in Supabase\n' +
              '4. Deploy edge functions\n\n' +
              'The document was uploaded but claim fields were not populated.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } else {
            Alert.alert(
              'Extraction Failed', 
              `The document was uploaded but extraction failed: ${error.message}`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          }
        } finally {
          setProcessing(false);
        }
      } else {
        setUploading(false);
        router.back();
      }
    } catch (error: any) {
      setUploading(false);
      setProcessing(false);
      Alert.alert('Upload Error', error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Header title="Upload Document" subtitle="Add documents to your claim" />

      <Section title="Select Document Type">
        <View style={styles.typeGrid}>
          {documentTypes.map((type) => (
            <Pressable
              key={type.value}
              style={[
                styles.typeCard,
                selectedType === type.value && styles.typeCardActive,
              ]}
              onPress={() => setSelectedType(type.value)}
            >
              <Text
                style={[
                  styles.typeText,
                  selectedType === type.value && styles.typeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Choose File">
        <Pressable style={styles.pickButton} onPress={pickDocument}>
          <Text style={styles.pickButtonText}>
            {selectedFile ? '📄 Change Document' : '📁 Pick Document'}
          </Text>
        </Pressable>

        {selectedFile && (
          <View style={styles.selectedFile}>
            <Text style={styles.fileName}>Selected: {selectedFile.name}</Text>
            <Text style={styles.fileType}>Type: {selectedFile.type}</Text>
          </View>
        )}
      </Section>

      {selectedType === 'fnol' && (
        <Section title="FNOL Processing">
          <Text style={styles.infoText}>
            After upload, AI will automatically extract claim data including:
            {'\n\n'}• Policy details and claim number{'\n'}
            • Insured information{'\n'}
            • Loss details and description{'\n'}
            • Adjuster assignment{'\n'}
            • Reporter information{'\n'}
            • Official reports (police/fire)
            {'\n\n'}
            This data will populate the claim fields automatically.
          </Text>
        </Section>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={uploading || processing}
        >
          <Text style={styles.buttonTextDark}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            (!selectedFile || uploading || processing) && styles.buttonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!selectedFile || uploading || processing}
        >
          {uploading || processing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              {processing ? 'Processing...' : 'Upload Document'}
            </Text>
          )}
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  typeCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.light,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6771',
  },
  typeTextActive: {
    color: colors.primary,
  },
  pickButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  pickButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  selectedFile: {
    backgroundColor: colors.white,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  fileType: {
    fontSize: 12,
    color: '#5F6771',
  },
  infoText: {
    fontSize: 13,
    color: '#5F6771',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.gold,
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
});

