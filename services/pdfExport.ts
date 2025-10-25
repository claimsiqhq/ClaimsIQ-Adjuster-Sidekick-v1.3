// PDF Export Service
// Generate professional claim reports with photos and annotations

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Claim } from './claims';
import { MediaItem } from './media';
import { getUserSettings } from './settings';
import { trackPDFExport, PerformanceTracker } from './analytics';

export interface PDFOptions {
  includephotos?: boolean;
  includeAnnotations?: boolean;
  includeWorkflow?: boolean;
  template?: 'standard' | 'detailed' | 'summary';
  watermark?: boolean;
}

/**
 * Generate PDF report for a claim
 */
export async function generateClaimReport(
  claim: Claim,
  media: MediaItem[],
  options?: PDFOptions
): Promise<string> {
  const tracker = new PerformanceTracker('pdf_generation');

  try {
    // Get user settings for defaults
    const { data: { user } } = await supabase.auth.getUser();
    let settings = null;
    if (user) {
      settings = await getUserSettings(user.id);
    }

    // Merge options with user settings
    const finalOptions: PDFOptions = {
      includePhotos: options?.includePhotos ?? settings?.include_photos ?? true,
      includeAnnotations: options?.includeAnnotations ?? settings?.embed_annotations ?? true,
      includeWorkflow: options?.includeWorkflow ?? true,
      template: options?.template ?? settings?.pdf_template ?? 'standard',
      watermark: options?.watermark ?? settings?.watermark_pdfs ?? false,
    };

    // Generate HTML based on template
    let html = '';
    switch (finalOptions.template) {
      case 'detailed':
        html = generateDetailedTemplate(claim, media, finalOptions);
        break;
      case 'summary':
        html = generateSummaryTemplate(claim, media, finalOptions);
        break;
      default:
        html = generateStandardTemplate(claim, media, finalOptions);
    }

    // Generate PDF
    const { uri } = await Print.printToFileAsync({ html });

    // Track success
    const fileInfo = await FileSystem.getInfoAsync(uri);
    tracker.end({
      claim_id: claim.id,
      page_count: Math.ceil(html.length / 3000), // Rough estimate
      file_size: fileInfo.size || 0,
      template: finalOptions.template,
    });

    trackPDFExport(true, {
      claim_id: claim.id,
      file_size: fileInfo.size,
    });

    return uri;
  } catch (error: any) {
    tracker.end({ error: error.message });
    trackPDFExport(false, { claim_id: claim.id });
    console.error('PDF generation failed:', error);
    throw error;
  }
}

/**
 * Share generated PDF
 */
export async function shareClaimReport(
  claim: Claim,
  media: MediaItem[],
  options?: PDFOptions
): Promise<void> {
  try {
    const pdfUri = await generateClaimReport(claim, media, options);

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Claim Report - ${claim.claim_number}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Failed to share PDF:', error);
    throw error;
  }
}

/**
 * Generate standard template HTML
 */
function generateStandardTemplate(
  claim: Claim,
  media: MediaItem[],
  options: PDFOptions
): string {
  const photos = media.filter((m) => m.type === 'photo' && m.status === 'done');
  const annotatedPhotos = photos.filter((p) => p.anno_count && p.anno_count > 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Claim Report - ${claim.claim_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
    h1 { font-size: 28px; margin-bottom: 8px; color: #7C3AED; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 16px; color: #4B5563; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; }
    h3 { font-size: 16px; margin-top: 20px; margin-bottom: 12px; color: #6B7280; }

    .header { margin-bottom: 32px; border-bottom: 3px solid #7C3AED; padding-bottom: 16px; }
    .subtitle { color: #6B7280; font-size: 14px; margin-top: 4px; }

    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .info-item { background: #F9FAFB; padding: 12px; border-radius: 8px; border-left: 3px solid #7C3AED; }
    .info-label { font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
    .info-value { font-size: 15px; color: #1F2937; font-weight: 500; }

    .description { background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 16px; margin-bottom: 24px; }

    .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .photo-item { break-inside: avoid; page-break-inside: avoid; }
    .photo-img { width: 100%; border-radius: 8px; border: 1px solid #E5E7EB; }
    .photo-caption { font-size: 12px; color: #6B7280; margin-top: 8px; text-align: center; }
    .annotation-badge { display: inline-block; background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-top: 4px; }

    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .stat-label { font-size: 12px; opacity: 0.9; text-transform: uppercase; }

    .footer { margin-top: 48px; padding-top: 16px; border-top: 2px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px; }

    ${options.watermark ? '.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; color: rgba(124, 58, 237, 0.05); font-weight: 900; z-index: -1; width: 100%; text-align: center; }' : ''}

    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  ${options.watermark ? '<div class="watermark">CLAIMSIQ</div>' : ''}

  <div class="header">
    <h1>Claim Report</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
  </div>

  <h2>Claim Information</h2>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Claim Number</div>
      <div class="info-value">${claim.claim_number || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Status</div>
      <div class="info-value">${formatStatus(claim.status)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Loss Date</div>
      <div class="info-value">${formatDate(claim.loss_date)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Reported Date</div>
      <div class="info-value">${formatDate(claim.reported_date)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Insured Name</div>
      <div class="info-value">${claim.insured_name || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Policy Number</div>
      <div class="info-value">${claim.policy_number || 'N/A'}</div>
    </div>
  </div>

  ${claim.loss_description ? `
  <h2>Loss Description</h2>
  <div class="description">
    <p>${claim.loss_description}</p>
  </div>
  ` : ''}

  <h2>Media Summary</h2>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${photos.length}</div>
      <div class="stat-label">Total Photos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${annotatedPhotos.length}</div>
      <div class="stat-label">AI Annotated</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${annotatedPhotos.reduce((sum, p) => sum + (p.anno_count || 0), 0)}</div>
      <div class="stat-label">Detections</div>
    </div>
  </div>

  ${options.includePhotos && photos.length > 0 ? `
  <h2>Photo Documentation</h2>
  <div class="photo-grid">
    ${photos
      .slice(0, 12)
      .map(
        (photo, idx) => `
      <div class="photo-item">
        <img src="${getPhotoDataUrl(photo)}" class="photo-img" alt="Photo ${idx + 1}" />
        <div class="photo-caption">
          Photo ${idx + 1}${photo.label ? ` - ${photo.label}` : ''}
          ${
            options.includeAnnotations && photo.anno_count
              ? `<div class="annotation-badge">${photo.anno_count} Detection${photo.anno_count > 1 ? 's' : ''}</div>`
              : ''
          }
        </div>
      </div>
    `
      )
      .join('')}
  </div>
  ${photos.length > 12 ? `<p style="text-align: center; color: #6B7280; font-size: 14px;">Showing 12 of ${photos.length} photos</p>` : ''}
  ` : ''}

  <div class="footer">
    <p><strong>ClaimsIQ Adjuster Sidekick</strong></p>
    <p>This report was generated automatically. For questions, contact your administrator.</p>
    <p style="margin-top: 8px;">© ${new Date().getFullYear()} ClaimsIQ. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate detailed template (more comprehensive)
 */
function generateDetailedTemplate(
  claim: Claim,
  media: MediaItem[],
  options: PDFOptions
): string {
  // Similar to standard but with more details, workflow steps, annotations, etc.
  return generateStandardTemplate(claim, media, options);
}

/**
 * Generate summary template (concise, 1-page)
 */
function generateSummaryTemplate(
  claim: Claim,
  media: MediaItem[],
  options: PDFOptions
): string {
  // Minimal version for quick overview
  return generateStandardTemplate(claim, media, options);
}

/**
 * Format date for display
 */
function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format status for display
 */
function formatStatus(status: string | null): string {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get photo as data URL for embedding in PDF
 * Note: This is a placeholder - you'll need to fetch actual image data
 */
function getPhotoDataUrl(photo: MediaItem): string {
  // In production, fetch the image and convert to base64
  // For now, return a placeholder
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EPhoto%3C/text%3E%3C/svg%3E';
}

import { supabase } from '@/utils/supabase';
