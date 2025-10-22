// services/documents.ts
import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export type DocumentType = 'fnol' | 'estimate' | 'photo' | 'report' | 'invoice' | 'correspondence' | 'other';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'error';

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
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer for Supabase storage
    const arrayBuffer = decode(base64);
    
    // Get file info for size
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileSize = (fileInfo as any).size || 0;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, arrayBuffer, {
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

export async function triggerFNOLExtraction(documentId: string, claimId?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('fnol-extract', {
    body: { documentId, claimId },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'FNOL extraction failed');
}

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

export function getDocumentPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return data?.publicUrl ?? null;
}

