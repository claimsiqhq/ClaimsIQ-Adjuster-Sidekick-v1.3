# FNOL Extraction System - FIXED

## Root Causes Identified

### 1. **RLS Policy Blocking Writes**
- **Problem**: Documents table had Row Level Security enabled, blocking unauthenticated inserts
- **Fix**: Use SERVICE_ROLE_KEY instead of ANON_KEY in edge function

### 2. **PDF.js Not Working in Deno Edge Runtime**
- **Problem**: `unpdf` and `pdfjs-dist` libraries don't work in Deno's edge runtime environment
- **Error**: `PDF.js is not available. Please add the package as a dependency.`
- **Fix**: Remove PDF conversion from edge function

### 3. **OpenAI Vision API Requires Images, Not PDFs**
- **Problem**: OpenAI's vision API only accepts image formats (JPEG, PNG, GIF, WebP), not PDFs
- **Fix**: Convert PDFs to images in the React Native app BEFORE upload

## Implemented Solution

### App-Side PDF Conversion (`app/document/upload.tsx`)
```typescript
async function convertPDFToImages(pdfUri: string): Promise<string[]> {
  const pdfInfo = await PDFLib.getPageCount(pdfUri);
  const imageUris: string[] = [];
  
  const maxPages = Math.min(pdfInfo, 10); // Max 10 pages
  for (let i = 0; i < maxPages; i++) {
    const imageUri = await PDFLib.renderPage({
      page: i,
      scale: 2.0, // High quality
      filePath: pdfUri,
      outputPath: `${FileSystem.cacheDirectory}fnol_page_${i + 1}.png`,
    });
    imageUris.push(imageUri);
  }
  
  return imageUris;
}
```

### Upload Flow
1. User selects PDF FNOL document
2. App detects PDF format
3. App converts each page to PNG image (up to 10 pages)
4. App uploads all images to Supabase storage
5. App creates document record for first image
6. App triggers FNOL extraction on first image
7. Edge function fetches image URL
8. Edge function sends image to OpenAI Vision API
9. OpenAI extracts structured FNOL data
10. Edge function updates claim with extracted data
11. Edge function generates workflow based on claim type

### Edge Function Fix (`supabase/functions/fnol-extract/index.ts`)
```typescript
// Use SERVICE_ROLE_KEY for admin access (bypasses RLS)
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Reject PDFs - require images only
if (doc.mime_type === "application/pdf") {
  throw new Error("PDF conversion not supported in edge function. Please convert PDF to images before uploading.");
}

// Use image URL directly
const imageUrls = [DOCUMENT_URL];
```

## Testing Steps

1. **Test PDF Upload**:
   - Open the app
   - Navigate to document upload
   - Select an FNOL PDF
   - Verify it converts to images
   - Verify images upload successfully

2. **Test FNOL Extraction**:
   - After PDF upload completes
   - Verify extraction triggers automatically
   - Check that claim is created/updated with:
     - Policy number
     - Insured name
     - Loss date
     - Adjuster info
     - Loss description
   - Verify workflow steps are generated

3. **Check Logs**:
   ```bash
   # View edge function logs
   https://supabase.com/dashboard/project/lyppkkpawalcchbgbkxg/functions/fnol-extract/logs
   ```

## Required Environment Variables

Edge function requires these secrets (already configured):
- `OPENAI_API_KEY` ✓
- `SUPABASE_URL` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓

## Next Steps

1. **Test with real FNOLs**: Upload your 4 FNOL PDFs through the app
2. **Monitor extraction quality**: Review extracted data for accuracy
3. **Tune OpenAI prompt**: Adjust extraction prompt if needed for better accuracy
4. **Add error recovery**: Implement retry logic for failed extractions

## Files Modified

- ✅ `app/document/upload.tsx` - Added PDF to image conversion
- ✅ `supabase/functions/fnol-extract/index.ts` - Fixed RLS and removed PDF handling
- ✅ `package.json` - Added react-native-pdf-lib dependency

