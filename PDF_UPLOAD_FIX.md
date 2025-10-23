# PDF Upload Fix - Troubleshooting Guide

## Issue Summary
The app was failing immediately when uploading PDFs. This was caused by two main issues:

1. **Code Bug**: Missing `await` on async file operations
2. **Configuration**: Missing storage buckets in Supabase

---

## What Was Fixed

### 1. File Resolution Bug (CRITICAL)
**File**: `services/documents.ts`

**Problem**: The `FileSystem.File.info()` method is async but was being called synchronously, causing immediate failure.

**Before**:
```typescript
const info = fileRef.info();  // ❌ Missing await
```

**After**:
```typescript
const info = await fileRef.info();  // ✅ Fixed
```

This fix was applied in two locations:
- Line 35: String URI handling
- Line 48: FileSystem.File handling

### 2. Enhanced Error Handling
**Files**: `services/documents.ts` and `app/document/upload.tsx`

Added comprehensive error logging and user-friendly error messages to help diagnose issues:

- File resolution errors
- Storage bucket errors
- Authentication errors
- RLS policy errors
- Network errors

### 3. Improved File Picker Validation
**File**: `app/document/upload.tsx`

Added validation to ensure we have a valid file source before attempting upload:

```typescript
const fileSource = (asset as any).file ?? asset.uri;
if (!fileSource) {
  throw new Error('Invalid file selected - no file or URI available');
}
```

---

## Required Supabase Configuration

### Step 1: Create Storage Buckets

The app requires two storage buckets to be configured in Supabase:
- `documents` - for PDFs and documents
- `media` - for photos and videos

**Option A: Using SQL Editor (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL script in `supabase-storage-setup.sql`
3. This will:
   - Create both buckets with proper configuration
   - Set up RLS policies
   - Configure file size limits (50MB)
   - Set allowed MIME types

**Option B: Using Supabase Dashboard**

1. Go to: Storage → Buckets
2. Click "New Bucket"
3. Create bucket: `documents`
   - Name: `documents`
   - Public: ✅ Yes
   - File size limit: 52428800 (50MB)
   - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
4. Create bucket: `media`
   - Name: `media`
   - Public: ✅ Yes
   - File size limit: 52428800 (50MB)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`
5. Configure RLS policies (see `supabase-storage-setup.sql`)

### Step 2: Verify Storage Configuration

Run this query in SQL Editor to verify buckets exist:

```sql
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('documents', 'media');
```

You should see both buckets listed with `public = true`.

---

## Testing the Fix

### Test 1: Basic Upload
1. Open the app
2. Go to a claim
3. Tap "Upload Document"
4. Select document type: "Other" (non-FNOL first)
5. Pick a PDF file
6. Tap "Upload Document"
7. ✅ Should succeed with "Document uploaded successfully!"

### Test 2: FNOL Upload (requires Edge Functions)
1. Follow Test 1 steps but select "FNOL" as document type
2. ✅ Upload should succeed
3. ⚠️  Extraction will only work if edge functions are deployed
4. If edge functions aren't deployed, you'll see a helpful message with deployment instructions

### Test 3: Error Messages
If something goes wrong, you should now see clear error messages:

- **"File Read Error"**: File couldn't be read - try selecting again
- **"Configuration Error"**: Storage buckets not configured (follow Step 1 above)
- **"Authentication Required"**: Session expired - log in again
- **"Permission Denied"**: RLS policies need configuration (run SQL script)

---

## Debugging Tips

### View Console Logs
The app now logs detailed information at each step:

```
[DocumentPicker] Selected asset: { name, uri, mimeType, size }
[Upload] Starting upload process: { fileName, fileType, fileSize, documentType }
[FileResolver] Processing string URI: file://...
[FileResolver] File exists, reading bytes...
[FileResolver] Successfully read 123456 bytes
[Upload] Uploading to Supabase storage: documents/...
[Upload] Storage upload successful
[Upload] Document uploaded successfully: abc-123-def
```

If it fails, you'll see exactly where:
```
[FileResolver] Error resolving file: Error message
[Upload] Storage upload failed: { message, statusCode, details }
[Upload] Upload failed: Error description
```

### Common Error Messages and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "File does not exist at URI" | Invalid file path | Try selecting file again |
| "Bucket not found" | Storage bucket doesn't exist | Run `supabase-storage-setup.sql` |
| "row-level security policy" | RLS blocking upload | Run storage RLS policies from SQL script |
| "Invalid JWT" / "Not authenticated" | Session expired | Log out and log back in |
| "Failed to read file" | File permission or format issue | Check file isn't corrupted |
| "Network request failed" | Connectivity issue | Check internet connection |

---

## Edge Functions (for FNOL Extraction)

After fixing the upload issue, FNOL extraction requires edge functions to be deployed.

### Quick Check
Upload a PDF with type "FNOL". If you see:
- ✅ "Document uploaded successfully!" → Upload is working
- ⚠️  "Edge Functions Not Deployed" → Need to deploy edge functions

### Deploy Edge Functions
See `SUPABASE_SETUP.md` for complete instructions:

```bash
# 1. Link to project
supabase link --project-ref lyppkkpawalcchbgbkxg

# 2. Set OpenAI API key in Supabase Dashboard
# Settings → Functions → Secrets → Add "OPENAI_API_KEY"

# 3. Deploy functions
supabase functions deploy fnol-extract
supabase functions deploy workflow-generate
supabase functions deploy vision-annotate
```

---

## Files Modified

1. ✅ `services/documents.ts` - Fixed async/await bug, added logging
2. ✅ `app/document/upload.tsx` - Enhanced error handling and validation
3. ✅ `supabase-storage-setup.sql` - NEW: SQL script for storage setup
4. ✅ `PDF_UPLOAD_FIX.md` - NEW: This troubleshooting guide

---

## Next Steps

1. **Run the storage setup SQL** (if not done already)
2. **Test the upload** with a non-FNOL document first
3. **Deploy edge functions** (if you want FNOL extraction)
4. **Monitor console logs** if you encounter any issues

---

## Summary

✅ **Fixed**: Async/await bug in file resolver
✅ **Added**: Comprehensive error handling and logging
✅ **Created**: Storage bucket setup SQL script
✅ **Improved**: File picker validation
📝 **Required**: Run `supabase-storage-setup.sql` in Supabase SQL Editor

The app should now provide clear feedback at each step of the upload process!
