// services/documents.ts
import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';

export type DocumentType = 'fnol' | 'estimate' | 'photo' | 'report' | 'invoice' | 'correspondence' | 'other';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'error';

type BlobLike = globalThis.Blob;
type UploadSource = string | BlobLike | FileSystem.File;

export interface UploadDocumentParams {
  file: UploadSource;
  fileName: string;
  documentType: DocumentType;
  claimId?: string;
  mimeType?: string;
  fileSize?: number;
}

function isExpoFile(source: UploadSource): source is FileSystem.File {
  return typeof source !== 'string' && source instanceof FileSystem.File;
}

function isBlobLike(source: UploadSource): source is BlobLike {
  return typeof source !== 'string' && typeof (source as BlobLike).arrayBuffer === 'function';
}

async function resolveFileForUpload(source: UploadSource): Promise<{
  bytes: Uint8Array;
  size: number;
  uri?: string;
}> {
  try {
    if (typeof source === 'string') {
      console.log('[FileResolver] Processing string URI:', source);
      const fileRef = new FileSystem.File(source);
      const info = await fileRef.info();

      if (!info.exists) {
        throw new Error(`File does not exist at URI: ${source}`);
      }

      console.log('[FileResolver] File exists, reading bytes...');
      const bytes = new Uint8Array(await fileRef.arrayBuffer());
      const size = info.size ?? fileRef.size ?? bytes.length;

      console.log('[FileResolver] Successfully read', bytes.length, 'bytes');
      return { bytes, size, uri: fileRef.uri };
    }

    if (isExpoFile(source)) {
      console.log('[FileResolver] Processing FileSystem.File');
      const info = await source.info();
      const bytes = new Uint8Array(await source.arrayBuffer());
      const size = info.size ?? source.size ?? bytes.length;

      console.log('[FileResolver] Successfully read', bytes.length, 'bytes');
      return { bytes, size, uri: source.uri };
    }

    if (isBlobLike(source)) {
      console.log('[FileResolver] Processing Blob');
      const blob = source as BlobLike;
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const size = blob.size ?? bytes.length;

      console.log('[FileResolver] Successfully read', bytes.length, 'bytes from Blob');
      return { bytes, size, uri: undefined };
    }

    throw new Error('Unsupported file input provided for upload.');
  } catch (error: any) {
    console.error('[FileResolver] Error resolving file:', error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
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
 * The file input can be an Expo `File`, a Blob/File instance, or a file URI string. It is
 * normalized into a Uint8Array before being streamed to Supabase Storage.
 */
export async function uploadDocument({
  file,
  fileName,
  documentType,
  claimId,
  mimeType,
  fileSize,
}: UploadDocumentParams): Promise<Document> {
  try {
    console.log('[Upload] Starting upload:', { fileName, documentType });

    // Check authentication first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in again.');
    }
    console.log('[Upload] User authenticated:', session.user.id);

    // Generate unique storage path
    const timestamp = Date.now();
    const ext = fileName.split('.').pop() || 'pdf';
    const storagePath = `documents/${timestamp}_${fileName}`;

    // Determine MIME type
    const contentType = mimeType || (ext.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg');

    // Resolve bytes using the modern FileSystem API or Blob interfaces
    console.log('[Upload] Resolving file bytes...');
    const { bytes, size: resolvedSize, uri } = await resolveFileForUpload(file);
    const uploadSize = fileSize ?? resolvedSize ?? bytes.length;
    console.log('[Upload] File info:', { uri, size: uploadSize });

    console.log('[Upload] Uploading to Supabase storage:', storagePath);
    console.log('[Upload] Content type:', contentType);
    console.log('[Upload] Data size:', bytes.length, 'bytes');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, bytes, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Storage upload failed:', uploadError);
      console.error('[Upload] Error details:', {
        message: uploadError.message,
        statusCode: (uploadError as any).statusCode,
        details: (uploadError as any).details,
      });
      
      // Check for specific error types
      if (uploadError.message?.includes('row-level security')) {
        throw new Error('Storage access denied. Check RLS policies for documents bucket.');
      } else if (uploadError.message?.includes('Invalid JWT')) {
        throw new Error('Authentication expired. Please log in again.');
      } else if (uploadError.message?.includes('Bucket not found')) {
        throw new Error('Documents storage bucket not found. Please create it in Supabase.');
      }
      
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }
    console.log('[Upload] Storage upload successful:', uploadData);

    // Create document record with ALL columns populated
    const documentRecord: any = {
      claim_id: claimId || null,
      user_id: session.user.id,
      org_id: (session.user as any).org_id || null, // If user has org_id
      document_type: documentType,
      file_name: fileName,
      storage_path: storagePath,
      mime_type: contentType,
      file_size_bytes: uploadSize,
      extraction_status: 'pending',
      extraction_error: null,
      extraction_confidence: null,
      extracted_data: null,
      tags: [], // Will be populated after extraction
      metadata: {
        uploaded_at: new Date().toISOString(),
        original_filename: fileName,
        content_type: contentType,
      }
    };
    
    console.log('[Upload] Creating document record with ALL columns populated');
    
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert(documentRecord)
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
 * Processes a FNOL document to extract claim data and populate the claims table
 * 
 * @param {string} documentId - The ID of the document to process.
 * @param {string} [claimId] - Optional. The ID of the claim to update, or create new if not provided.
 * @returns {Promise<any>} The extracted FNOL data and claim ID
 * @throws {Error} Throws an error if the function invocation fails or returns an error.
 */
export async function triggerFNOLExtraction(documentId: string, claimId?: string): Promise<any> {
  console.log('[FNOL] Starting extraction for document:', documentId);
  
  try {
    // Call edge function to extract data from PDF
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
    
    // Parse the extracted data and create/update the claim
    if (data?.extraction) {
      const extracted = data.extraction;
      const { data: { session } } = await supabase.auth.getSession();
      
      // Map FNOL extracted data to claim columns
      const claimData: any = {
        claim_number: extracted.claim_number || extracted.claimNumber,
        policy_number: extracted.policy_number || extracted.policyNumber,
        
        // Insured information
        insured_name: extracted.insured_name || extracted.insuredName,
        insured_phone: extracted.insured_phone || extracted.insuredPhone || extracted.insuredCellPhone,
        insured_email: extracted.insured_email || extracted.insuredEmail,
        insured_address: extracted.insured_address || extracted.insuredAddress || extracted.insuredMailingAddress,
        
        // Loss information
        loss_date: extracted.loss_date || extracted.lossDate || extracted.dateOfLoss,
        loss_time: extracted.loss_time || extracted.lossTime || extracted.timeOfLoss,
        loss_address: extracted.loss_address || extracted.lossAddress || extracted.lossLocation,
        loss_description: extracted.loss_description || extracted.lossDescription,
        loss_type: extracted.loss_type || extracted.lossType || extracted.claimType || extracted.causeOfLoss,
        
        // Adjuster information
        adjuster_name: extracted.adjuster_name || extracted.adjusterName || extracted.adjusterAssigned,
        adjuster_phone: extracted.adjuster_phone || extracted.adjusterPhone,
        adjuster_email: extracted.adjuster_email || extracted.adjusterEmail,
        
        // Carrier/Agency information
        carrier_name: extracted.carrier_name || extracted.carrierName,
        agency_name: extracted.agency_name || extracted.agencyName,
        agency_phone: extracted.agency_phone || extracted.agencyPhone,
        
        // Policy dates
        policy_start_date: extracted.policy_start_date || extracted.policyStartDate || extracted.policyPeriod?.start,
        policy_end_date: extracted.policy_end_date || extracted.policyEndDate || extracted.policyPeriod?.end,
        
        // Additional fields
        estimated_loss: extracted.estimated_loss || extracted.estimatedLoss,
        status: 'pending',
        user_id: session?.user?.id,
      };
      
      // Remove null/undefined values
      Object.keys(claimData).forEach(key => {
        if (claimData[key] === null || claimData[key] === undefined) {
          delete claimData[key];
        }
      });
      
      console.log('[FNOL] Mapped claim data:', claimData);
      
      // Create or update the claim with extracted data
      if (claimId) {
        // Update existing claim
        const { data: updatedClaim, error: updateError } = await supabase
          .from('claims')
          .update(claimData)
          .eq('id', claimId)
          .select('*')
          .single();
          
        if (updateError) {
          console.error('[FNOL] Failed to update claim:', updateError);
          throw new Error(`Failed to update claim: ${updateError.message}`);
        }
        
        console.log('[FNOL] Updated claim with extracted data:', updatedClaim.id);
        
        // Update document with extraction results
        await supabase
          .from('documents')
          .update({
            extracted_data: extracted,
            extraction_status: 'completed',
            claim_id: claimId,
          })
          .eq('id', documentId);
        
        return { claimId, extracted, claim: updatedClaim };
      } else {
        // Create new claim with extracted data
        const { data: newClaim, error: createError } = await supabase
          .from('claims')
          .insert(claimData)
          .select('*')
          .single();
          
        if (createError) {
          console.error('[FNOL] Failed to create claim:', createError);
          throw new Error(`Failed to create claim: ${createError.message}`);
        }
        
        console.log('[FNOL] Created new claim with extracted data:', newClaim.id);
        
        // Update document with extraction results and link to new claim
        await supabase
          .from('documents')
          .update({
            extracted_data: extracted,
            extraction_status: 'completed',
            claim_id: newClaim.id,
          })
          .eq('id', documentId);
        
        return { claimId: newClaim.id, extracted, claim: newClaim };
      }
    }
    
    return { claimId, extracted: null };
  } catch (error: any) {
    console.error('[FNOL] Caught error during extraction:', error);
    
    // Mark document as failed
    await supabase
      .from('documents')
      .update({
        extraction_status: 'error',
        extraction_error: error.message,
      })
      .eq('id', documentId);
    
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

