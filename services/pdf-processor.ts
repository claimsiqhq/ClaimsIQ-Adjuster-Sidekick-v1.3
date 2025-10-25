// services/pdf-processor.ts
// Handles PDF to image conversion for React Native/Expo
// Since we can't directly convert PDFs to images in React Native,
// we'll use a different approach

import { supabase } from '@/utils/supabase';
import { Alert } from 'react-native';

export interface ProcessedPage {
  pageNumber: number;
  base64Image: string;
  width: number;
  height: number;
}

/**
 * Initiates the server-side processing of a PDF for First Notice of Loss (FNOL) extraction.
 * Due to the limitations of PDF handling in React Native, this function offloads the complex
 * task of PDF-to-image conversion and data extraction to a Supabase Edge Function.
 *
 * @param {string} pdfUri - The local URI of the PDF file. Note: This is not used directly for upload
 *                          in this flow but is kept for context. The document should already be in storage.
 * @param {string} documentId - The unique ID of the document record in the database, which points to the PDF in storage.
 * @returns {Promise<any>} A promise that resolves with the result from the server-side extraction process.
 * @throws {Error} Throws an error if the Edge Function invocation fails.
 */
export async function processPDFForExtraction(pdfUri: string, documentId: string): Promise<any> {
  try {
    // For now, we'll send the PDF to a server-side function
    // that will handle the conversion and extraction
    // This is the most reliable approach for React Native

    // Option 1: Use a PDF conversion service
    // Many services like pdf.co, convertapi, or cloudmersive can convert PDF to images

    // Option 2: Use Supabase Edge Function with PDF processing
    // The edge function would need to:
    // 1. Download the PDF
    // 2. Convert to images using a service or library
    // 3. Process with OpenAI Vision

    // Option 3: Use a cloud function that processes PDFs
    // This could be AWS Lambda, Google Cloud Functions, etc.

    // For immediate functionality, let's call the edge function
    // which should be updated to handle PDF conversion
    const { data, error } = await supabase.functions.invoke('fnol-extract-v2', {
      body: {
        documentId,
        // Signal that this needs PDF to image conversion
        requiresConversion: true,
      },
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('PDF processing error:', error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}

/**
 * Converts a PDF from a given URL to a series of images using an external API.
 * This is a practical approach for React Native where client-side PDF processing is challenging.
 *
 * @param {string} pdfUrl - The public URL of the PDF file to be converted.
 * @returns {Promise<ProcessedPage[]>} A promise that resolves to an array of objects, each
 *          representing a page of the PDF with its image data.
 * @throws {Error} Throws an error if the API key is not configured or if the conversion fails.
 */
export async function convertPDFToImages(pdfUrl: string): Promise<ProcessedPage[]> {
  // Example using a PDF conversion API
  // You would need to sign up for one of these services:
  // - pdf.co
  // - convertapi.com
  // - cloudmersive.com
  // - pdf-lib (if processing client-side is possible)

  try {
    // This is a placeholder for the actual API call
    // You would replace this with the actual API endpoint
    const PDF_API_KEY = process.env.EXPO_PUBLIC_PDF_API_KEY;

    if (!PDF_API_KEY) {
      throw new Error('PDF conversion API key not configured');
    }

    // Example API call structure
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/png', {
      method: 'POST',
      headers: {
        'x-api-key': PDF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: pdfUrl,
        pages: '0-', // All pages
        inline: true, // Return as base64
      }),
    });

    if (!response.ok) {
      throw new Error('PDF conversion failed');
    }

    const result = await response.json();

    // Convert the API response to our format
    const pages: ProcessedPage[] = result.images.map((img: any, index: number) => ({
      pageNumber: index + 1,
      base64Image: img.base64,
      width: img.width || 1024,
      height: img.height || 1024,
    }));

    return pages;
  } catch (error: any) {
    console.error('PDF to image conversion error:', error);
    throw error;
  }
}

/**
 * Sends the images of a processed PDF to a Supabase Edge Function for data extraction using AI.
 *
 * @param {ProcessedPage[]} pages - An array of objects, each containing the base64-encoded image of a PDF page.
 * @param {string} documentId - The ID of the document this extraction pertains to.
 * @returns {Promise<any>} A promise that resolves to the extracted data.
 * @throws {Error} Throws an error if the data extraction process fails.
 */
export async function extractDataFromPDFImages(pages: ProcessedPage[], documentId: string): Promise<any> {
  try {
    // Send all pages to the extraction edge function
    const { data, error } = await supabase.functions.invoke('fnol-extract-images', {
      body: {
        documentId,
        pages: pages.map((p) => ({
          pageNumber: p.pageNumber,
          base64: p.base64Image,
        })),
      },
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Data extraction error:', error);
    throw error;
  }
}

/**
 * Orchestrates the complete workflow for processing a First Notice of Loss (FNOL) PDF document.
 * This function guides the user through the multi-step process, providing feedback at each stage.
 * It handles PDF-to-image conversion, AI-powered data extraction, and updates the document record
 * with the results or any errors that occur.
 *
 * @param {string} pdfUri - The local URI of the PDF file.
 * @param {string} pdfUrl - The public URL of the PDF file in storage.
 * @param {string} documentId - The unique ID of the document record.
 * @returns {Promise<any>} A promise that resolves to the final extracted data.
 * @throws {Error} Throws an error if any step in the workflow fails.
 */
export async function processCompleteFNOLDocument(
  pdfUri: string,
  pdfUrl: string,
  documentId: string
): Promise<any> {
  try {
    Alert.alert('Processing PDF', 'Converting PDF pages to images for AI extraction...');

    // Step 1: Convert PDF to images
    const pages = await convertPDFToImages(pdfUrl);

    if (pages.length === 0) {
      throw new Error('No pages found in PDF');
    }

    Alert.alert('Processing PDF', `Found ${pages.length} pages. Extracting data with AI...`);

    // Step 2: Extract data from images
    const extractedData = await extractDataFromPDFImages(pages, documentId);

    // Step 3: Update document record with extracted data
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_data: extractedData,
        extraction_status: 'completed',
        extraction_confidence: extractedData.confidence || 0.85,
      })
      .eq('id', documentId);

    if (updateError) throw updateError;

    return extractedData;
  } catch (error: any) {
    // Update document with error status
    await supabase
      .from('documents')
      .update({
        extraction_status: 'error',
        extraction_error: error.message,
      })
      .eq('id', documentId);

    throw error;
  }
}