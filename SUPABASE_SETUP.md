# Supabase Edge Functions Setup Guide

## ⚠️ IMPORTANT: Required Configuration

Your edge functions for AI processing are failing because the OpenAI API key needs to be configured in Supabase. Here's how to fix it:

## 1. Configure Edge Function Secrets in Supabase

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `lyppkkpawalcchbgbkxg`
3. Navigate to: **Settings** → **Functions** → **Secrets**

### Step 2: Add Required API Keys
1. Click **"New Secret"** for each of the following:

**OpenAI API Key (REQUIRED):**
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)

2. Click **"Create Secret"** after each one

## 2. Deploy Edge Functions

### Step 1: Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

### Step 2: Link to your project
```bash
supabase link --project-ref lyppkkpawalcchbgbkxg
```

### Step 3: Deploy the edge functions
```bash
# Deploy Vision annotation function (FIXED - handles camera photos with AI damage detection)
supabase functions deploy vision-annotate

# Deploy FNOL extraction function (uses free unpdf library for PDF conversion)
supabase functions deploy fnol-extract-with-conversion

# Deploy Daily optimization function
supabase functions deploy daily-optimize

# Deploy Workflow generation function
supabase functions deploy workflow-generate
```

**IMPORTANT FIXES APPLIED:**
- `vision-annotate`: Fixed response_format bug that was causing camera/photo errors
- `fnol-extract-with-conversion`: Added proper PDF to image conversion for multi-page documents

## 3. Verify Functions are Working

After deployment, test the functions:

### Test Photo Annotation:
1. Open the app
2. Go to Capture tab
3. Take a photo
4. Check if AI annotation completes successfully

### Test PDF Upload:
1. Go to Claims tab
2. Click "+ Upload FNOL"
3. Select a PDF
4. Check if extraction completes

## 4. Alternative: Direct API Integration (Temporary Fix)

If you can't deploy edge functions immediately, I can create a temporary direct API integration that bypasses edge functions and calls OpenAI directly from the app.

## 5. Required Database Tables

Make sure these tables exist in your Supabase database:

### Documents Table
```sql
CREATE TABLE documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  claim_id uuid REFERENCES claims(id),
  user_id uuid,
  org_id uuid,
  document_type text,
  file_name text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  extracted_data jsonb,
  extraction_status text DEFAULT 'pending',
  extraction_error text,
  extraction_confidence numeric,
  tags text[],
  metadata jsonb
);
```

### Media Table
```sql
CREATE TABLE media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  user_id uuid,
  org_id uuid,
  claim_id uuid REFERENCES claims(id),
  type text DEFAULT 'photo',
  status text DEFAULT 'pending',
  label text,
  storage_path text,
  anno_count integer DEFAULT 0,
  qc jsonb,
  annotation_json jsonb,
  redaction_json jsonb,
  derived jsonb,
  last_error text
);
```

### App Prompts Table (for AI prompts)
```sql
CREATE TABLE app_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  org_id uuid,
  key text NOT NULL,
  role text DEFAULT 'system',
  description text,
  template text NOT NULL,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  metadata jsonb
);
```

## 6. Storage Buckets

Ensure these storage buckets exist and are public:
1. **media** bucket - for photos
2. **documents** bucket - for PDFs

To create/configure:
1. Go to Supabase Dashboard → Storage
2. Create buckets if they don't exist
3. Set both buckets to "Public" for read access

## 7. Environment Variables

Your app has these configured:
- ✅ `EXPO_PUBLIC_SUPABASE_URL`: https://lyppkkpawalcchbgbkxg.supabase.co
- ✅ `EXPO_PUBLIC_SUPABASE_API_KEY`: (anon key)
- ✅ `OPENAI_API_KEY`: Available in app environment

## Troubleshooting

### Error: "Edge function returned non-2XX status code"
- **Cause**: OpenAI API key not configured in Supabase Edge Functions
- **Solution**: Follow Step 1 above to add the secret

### Error: "Property 'blob' doesn't exist"
- **Cause**: React Native file handling issue
- **Solution**: Already fixed in the code using ArrayBuffer conversion

### Error: "Photo not found"
- **Cause**: Media record or storage path issue
- **Solution**: Check that the media storage bucket exists and is public

## Need Help?

If you continue to experience issues:
1. Check Supabase Dashboard → Functions → Logs for detailed error messages
2. Verify all database tables and storage buckets exist
3. Ensure the OpenAI API key is valid and has sufficient credits

## Quick Alternative

If you need the app working immediately without edge functions, let me know and I'll create a direct OpenAI integration that works without Supabase Edge Functions.