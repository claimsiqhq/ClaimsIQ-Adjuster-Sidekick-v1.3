// services/reports.ts
// Report generation and PDF export

import { supabase } from '@/utils/supabase';
import { listMedia, getPublicUrl } from '@/services/media';
import { listDocuments } from '@/services/documents';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ReportOptions {
  claimId: string;
  includePhotos: boolean;
  includeAnnotations: boolean;
  includeFNOL: boolean;
  includeDocuments: boolean;
  template: 'standard' | 'detailed' | 'summary';
}

export interface ReportData {
  claim: any;
  photos: any[];
  documents: any[];
  generatedAt: string;
}

/**
 * Gathers all the necessary data to generate a claim report.
 * This function fetches claim details, associated photos, and documents based on the provided options.
 * It serves as the primary data aggregation step before rendering the report in a specific format.
 *
 * @param {string} claimId - The unique ID of the claim for which to generate the report data.
 * @param {Partial<ReportOptions>} [options={}] - An object specifying what to include in the report.
 * @returns {Promise<ReportData>} A promise that resolves to an object containing all the data for the report.
 * @throws {Error} Throws an error if the claim details cannot be fetched.
 */
export async function generateReportData(
  claimId: string,
  options: Partial<ReportOptions> = {}
): Promise<ReportData> {
  // Get claim details
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (claimError) throw claimError;

  // Get photos
  let photos: any[] = [];
  if (options.includePhotos !== false) {
    photos = await listMedia(100, { claim_id: claimId });
  }

  // Get documents
  let documents: any[] = [];
  if (options.includeDocuments) {
    documents = await listDocuments(claimId);
  }

  return {
    claim,
    photos,
    documents,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates an HTML string for a claim report based on the provided data and a template.
 *
 * @param {ReportData} data - The data object, typically from `generateReportData`.
 * @param {'standard' | 'detailed' | 'summary'} [template='standard'] - The visual template to use for the report.
 * @returns {string} An HTML string representing the report.
 */
export function generateHTMLReport(
  data: ReportData,
  template: 'standard' | 'detailed' | 'summary' = 'standard'
): string {
  const { claim, photos, documents, generatedAt } = data;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Claim Report - ${claim.claim_number || 'Unnamed'}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          border-bottom: 3px solid #7C3AED;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          color: #7C3AED;
          margin: 0;
          font-size: 28px;
        }
        .subtitle {
          color: #666;
          margin-top: 5px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #7C3AED;
          margin-bottom: 15px;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #F3F4F6;
        }
        .label {
          font-weight: 600;
          color: #4B5563;
        }
        .value {
          color: #1F2937;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        .photo-card {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          overflow: hidden;
        }
        .photo-card img {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }
        .photo-info {
          padding: 10px;
          background: #F9FAFB;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #E5E7EB;
          text-align: center;
          color: #9CA3AF;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Claims iQ Sidekick - Inspection Report</h1>
        <div class="subtitle">Claim #${claim.claim_number || 'Unnamed'}</div>
        <div class="subtitle">Generated: ${new Date(generatedAt).toLocaleString()}</div>
      </div>

      <div class="section">
        <div class="section-title">Claim Information</div>
        ${renderInfoRow('Claim Number', claim.claim_number)}
        ${renderInfoRow('Policy Number', claim.policy_number)}
        ${renderInfoRow('Carrier', claim.carrier_name)}
        ${renderInfoRow('Status', claim.status)}
        ${renderInfoRow('Insured Name', claim.insured_name)}
        ${renderInfoRow('Insured Phone', claim.insured_phone)}
        ${renderInfoRow('Insured Email', claim.insured_email)}
      </div>

      <div class="section">
        <div class="section-title">Loss Details</div>
        ${renderInfoRow('Loss Type', claim.loss_type)}
        ${renderInfoRow('Cause of Loss', claim.cause_of_loss)}
        ${renderInfoRow('Loss Date', claim.loss_date ? new Date(claim.loss_date).toLocaleDateString() : null)}
        ${renderInfoRow('Loss Location', claim.loss_location)}
        ${renderInfoRow('Description', claim.loss_description)}
        ${renderInfoRow('Estimated Loss', claim.estimated_loss ? '$' + claim.estimated_loss.toLocaleString() : null)}
      </div>

      ${
        claim.adjuster_name || claim.adjuster_email
          ? `
      <div class="section">
        <div class="section-title">Adjuster Information</div>
        ${renderInfoRow('Assigned To', claim.adjuster_name)}
        ${renderInfoRow('Email', claim.adjuster_email)}
        ${renderInfoRow('Phone', claim.adjuster_phone)}
      </div>
      `
          : ''
      }

      ${
        photos.length > 0
          ? `
      <div class="section">
        <div class="section-title">Photos (${photos.length})</div>
        <div class="photo-grid">
          ${photos
            .map(
              (photo) => `
            <div class="photo-card">
              <img src="${getPublicUrl(photo.storage_path) || ''}" alt="${photo.label || 'Photo'}">
              <div class="photo-info">
                <strong>${photo.label || 'Untitled'}</strong>
                ${photo.anno_count ? `<div>${photo.anno_count} detections</div>` : ''}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }

      ${
        documents.length > 0
          ? `
      <div class="section">
        <div class="section-title">Documents (${documents.length})</div>
        ${documents
          .map(
            (doc) => `
          <div class="info-row">
            <span class="label">${doc.file_name}</span>
            <span class="value">${doc.document_type}</span>
          </div>
        `
          )
          .join('')}
      </div>
      `
          : ''
      }

      <div class="footer">
        Generated by Claims iQ Sidekick © ${new Date().getFullYear()}
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Renders a single row of information for the HTML report.
 * @param {string} label - The label for the data.
 * @param {any} value - The value to be displayed.
 * @returns {string} An HTML string for the info row.
 */
function renderInfoRow(label: string, value: any): string {
  if (!value) return '';
  return `
    <div class="info-row">
      <span class="label">${label}:</span>
      <span class="value">${value}</span>
    </div>
  `;
}

/**
 * Exports a report to a local file. Currently, it saves the report as an HTML file.
 * This function can be extended to support PDF generation by integrating a library like
 * `react-native-html-to-pdf`.
 *
 * @param {ReportData} reportData - The data for the report.
 * @param {ReportOptions} options - The options for the report, including the template.
 * @returns {Promise<string>} A promise that resolves to the local file path of the generated report.
 */
export async function exportReportPDF(reportData: ReportData, options: ReportOptions): Promise<string> {
  const html = generateHTMLReport(reportData, options.template);

  // For now, save as HTML (PDF generation requires react-native-html-to-pdf or similar)
  const fileName = `claim_${reportData.claim.claim_number || reportData.claim.id}_${Date.now()}.html`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, html);

  return filePath;
}

/**
 * Opens the device's native share sheet to share the generated report file.
 *
 * @param {string} filePath - The local file path of the report to be shared.
 * @returns {Promise<void>}
 * @throws {Error} Throws an error if sharing is not available on the device.
 */
export async function shareReport(filePath: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/html',
    dialogTitle: 'Share Claim Report',
  });
}

