// app/document/upload.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import PDFLib from 'react-native-pdf-lib';
import { colors } from '@/theme/colors';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { uploadDocument, triggerFNOLExtraction, DocumentType } from '@/services/documents';

type BlobLike = globalThis.Blob;

export default function DocumentUploadScreen() {
  const router = useRouter();
  const { claimId } = useLocalSearchParams<{ claimId?: string }>();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<
    {
      name: string;
      uri?: string;
      type: string;
      file: string | BlobLike | FileSystem.File;
      size?: number;
    } | null
  >(null);
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

        console.log('[DocumentPicker] Selected asset:', {
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType,
          size: asset.size,
        });

        // Ensure we have a valid file source
        const fileSource = (asset as any).file ?? asset.uri;

        if (!fileSource) {
          throw new Error('Invalid file selected - no file or URI available');
        }

        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType || 'application/pdf',
          file: fileSource,
          size: asset.size,
        });
      }
    } catch (error: any) {
      console.error('[DocumentPicker] Error:', error);
      Alert.alert('Error', 'Failed to pick document: ' + error.message);
    }
  }

  async function convertPDFToImages(pdfUri: string): Promise<string[]> {
    console.log('[PDF Converter] Starting PDF conversion:', pdfUri);
    
    try {
      // Get number of pages in PDF
      const pdfInfo = await PDFLib.getPageCount(pdfUri);
      const numPages = pdfInfo;
      console.log(`[PDF Converter] PDF has ${numPages} pages`);
      
      const imageUris: string[] = [];
      
      // Convert each page to image (max 10 pages)
      const maxPages = Math.min(numPages, 10);
      for (let i = 0; i < maxPages; i++) {
        console.log(`[PDF Converter] Converting page ${i + 1}/${maxPages}`);
        
        // Render PDF page to image
        const imageUri = await PDFLib.renderPage({
          page: i,
          scale: 2.0, // High quality
          filePath: pdfUri,
          outputPath: `${FileSystem.cacheDirectory}fnol_page_${i + 1}.png`,
        });
        
        imageUris.push(imageUri);
        console.log(`[PDF Converter] Page ${i + 1} converted: ${imageUri}`);
      }
      
      return imageUris;
    } catch (error: any) {
      console.error('[PDF Converter] Error:', error);
      throw new Error(`Failed to convert PDF: ${error.message}`);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a document first');
      return;
    }

    try {
      setUploading(true);

      console.log('[Upload] Starting upload process:', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        documentType: selectedType,
      });

      // Check if file is a PDF - if so, convert to images first
      const isPDF = selectedFile.type === 'application/pdf' || 
                    selectedFile.name.toLowerCase().endsWith('.pdf');
      
      let documentsToUpload: any[] = [];
      
      if (isPDF && selectedType === 'fnol') {
        console.log('[Upload] PDF detected, converting to images...');
        Alert.alert('Converting PDF', 'Converting PDF pages to images for AI processing...');
        
        const imageUris = await convertPDFToImages(selectedFile.uri!);
        console.log(`[Upload] Converted ${imageUris.length} pages`);
        
        // Upload each image
        for (let i = 0; i < imageUris.length; i++) {
          const imageUri = imageUris[i];
          const imageName = selectedFile.name.replace('.pdf', `_page_${i + 1}.png`);
          
          const document = await uploadDocument({
            file: imageUri,
            fileName: imageName,
            documentType: selectedType,
            claimId,
            mimeType: 'image/png',
          });
          
          documentsToUpload.push(document);
          console.log(`[Upload] Uploaded page ${i + 1}: ${document.id}`);
        }
      } else {
        // Upload single document (image or non-FNOL PDF)
        const document = await uploadDocument({
          file: selectedFile.file,
          fileName: selectedFile.name,
          documentType: selectedType,
          claimId,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
        });
        
        documentsToUpload.push(document);
      }
      
      const document = documentsToUpload[0]; // Use first document for FNOL extraction

      console.log('[Upload] Document uploaded successfully:', document.id);
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

      console.error('[Upload] Upload failed:', error);

      // Provide helpful error messages based on error type
      let errorTitle = 'Upload Error';
      let errorMessage = error.message;

      if (error.message?.includes('Not authenticated')) {
        errorTitle = 'Authentication Required';
        errorMessage = 'Please log in again to upload documents.';
      } else if (error.message?.includes('Bucket not found')) {
        errorTitle = 'Configuration Error';
        errorMessage = 'Storage is not configured. Please contact support.';
      } else if (error.message?.includes('Failed to read file')) {
        errorTitle = 'File Read Error';
        errorMessage = 'Could not read the selected file. Please try selecting it again.';
      } else if (error.message?.includes('row-level security')) {
        errorTitle = 'Permission Denied';
        errorMessage = 'You do not have permission to upload files. Please contact support.';
      }

      Alert.alert(errorTitle, errorMessage);
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

