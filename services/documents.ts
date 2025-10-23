// services/documents.ts
import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';

export type DocumentType = 'fnol' | 'estimate' | 'photo' | 'report' | 'invoice' | 'correspondence' | 'other';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'error';

// Helper function to convert base64 to Uint8Array that works in React Native
function base64ToUint8Array(base64: string): Uint8Array {
  // This implementation works in React Native without atob
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  
  // Remove padding and calculate buffer size
  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }
  
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];
    
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  
  return bytes;
}

export interface Document {
  id: string;
  created_at: string;
  updated_at: string;
  claim_id: string | null;
  user_id: string | null;
  org_id: string | null;
  document_type: DocumentType;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  extracted_data: any;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  extraction_confidence: number | null;
  tags: string[] | null;
  metadata: any;
}

/**
 * Uploads a document to Supabase storage and creates a corresponding record in the database.
 * The file is read from the local file system, converted to an ArrayBuffer, and then uploaded.
 *
 * @param {string} fileUri - The local URI of the file to be uploaded.
 * @param {string} fileName - The name of the file.
 * @param {DocumentType} documentType - The type of the document (e.g., 'fnol', 'estimate').
 * @param {string} [claimId] - Optional. The ID of the claim this document is associated with.
 * @returns {Promise<Document>} A promise that resolves to the newly created document record.
 * @throws {Error} Throws an error if the file upload or database insertion fails.
 */
export async function uploadDocument(
  fileUri: string,
  fileName: string,
  documentType: DocumentType,
  claimId?: string
): Promise<Document> {
  try {
    // Generate unique storage path
    const timestamp = Date.now();
    const ext = fileName.split('.').pop() || 'pdf';
    const storagePath = `documents/${timestamp}_${fileName}`;

    // Read file as base64 using Expo FileSystem
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    // Convert base64 to Uint8Array for Supabase storage
    const uint8Array = base64ToUint8Array(base64);

    // Get file info for size
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileSize = (fileInfo as any).size || 0;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, uint8Array, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create document record
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert({
        claim_id: claimId || null,
        document_type: documentType,
        file_name: fileName,
        storage_path: storagePath,
        mime_type: 'application/pdf',
        file_size_bytes: fileSize,
        extraction_status: 'pending',
      })
      .select('*')
      .single();

    if (insertError) throw insertError;
    return data as Document;
  } catch (error: any) {
    console.error('Upload document error:', error);
    throw error;
  }
}

/**
 * Triggers the 'fnol-extract' Supabase Edge Function to process a First Notice of Loss document.
 * This function initiates an asynchronous process on the backend to extract data from the document.
 *
 * @param {string} documentId - The ID of the document to process.
 * @param {string} [claimId] - Optional. The ID of the claim associated with the document.
 * @returns {Promise<void>} A promise that resolves when the function has been successfully invoked.
 * @throws {Error} Throws an error if the function invocation fails or returns an error.
 */
export async function triggerFNOLExtraction(documentId: string, claimId?: string): Promise<void> {
  console.log('[FNOL] Starting extraction for document:', documentId);
  
  try {
    // Use the edge function that handles PDF to image conversion
    const { data, error } = await supabase.functions.invoke('fnol-extract', {
      body: { documentId, claimId },
    });

    console.log('[FNOL] Edge function response:', { data, error });

    if (error) {
      // Provide detailed error information
      const errorDetails = [
        `Edge Function Error: ${error.message || 'Unknown error'}`,
        '',
        'Common causes:',
        '1. Edge functions not deployed to Supabase',
        '2. OPENAI_API_KEY not configured in Supabase',
        '3. Network connectivity issues',
        '',
        'To fix: Deploy edge functions via Supabase CLI',
      ].join('\n');
      
      console.error('[FNOL] Extraction failed:', error);
      throw new Error(errorDetails);
    }
    
    if (!data?.success) {
      const errorMessage = data?.error || 'FNOL extraction failed';
      console.error('[FNOL] Extraction unsuccessful:', errorMessage);
      throw new Error(`Extraction failed: ${errorMessage}`);
    }
    
    console.log('[FNOL] Extraction completed successfully');
  } catch (error: any) {
    console.error('[FNOL] Caught error during extraction:', error);
    
    // Check if it's a network/deployment issue
    if (error.message?.includes('Failed to invoke function')) {
      throw new Error('Edge function not deployed. See DEPLOYMENT_GUIDE.md for setup instructions.');
    }
    
    throw error;
  }
}

/**
 * Retrieves a single document by its unique identifier.
 *
 * @param {string} id - The ID of the document to retrieve.
 * @returns {Promise<Document | null>} A promise that resolves to the document object, or null if not found or an error occurs.
 */
export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Get document error:', error);
    return null;
  }

  return data as Document | null;
}

/**
 * Lists all documents, with optional filtering by claim ID and document type.
 *
 * @param {string} [claimId] - Optional. The ID of the claim to filter documents by.
 * @param {DocumentType} [documentType] - Optional. The type of document to filter by.
 * @returns {Promise<Document[]>} A promise that resolves to an array of document objects.
 */
export async function listDocuments(claimId?: string, documentType?: DocumentType): Promise<Document[]> {
  let query = supabase.from('documents').select('*');

  if (claimId) {
    query = query.eq('claim_id', claimId);
  }

  if (documentType) {
    query = query.eq('document_type', documentType);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('List documents error:', error);
    return [];
  }

  return (data || []) as Document[];
}

/**
 * Deletes a document from the database and its corresponding file from storage.
 *
 * @param {string} id - The ID of the document to delete.
 * @returns {Promise<void>} A promise that resolves once the document is deleted.
 * @throws {Error} Throws an error if the document is not found or if the database deletion fails.
 */
export async function deleteDocument(id: string): Promise<void> {
  // Get document to find storage path
  const doc = await getDocument(id);
  if (!doc) throw new Error('Document not found');

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([doc.storage_path]);

  if (storageError) console.error('Storage delete error:', storageError);

  // Delete from database
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Generates a public URL for a document stored in Supabase storage.
 *
 * @param {string | null | undefined} path - The storage path of the document.
 * @returns {string | null} The public URL of the document, or null if the path is not provided.
 */
export function getDocumentPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return data?.publicUrl ?? null;
}

