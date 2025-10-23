# Edge Function Deployment Guide for ClaimsIQ Sidekick

## Prerequisites
You need:
- Supabase CLI installed on your local machine
- Access to your Supabase project dashboard
- OpenAI API key for AI features

## Step 1: Install Supabase CLI

### On macOS:
```bash
brew install supabase/tap/supabase
```

### On Windows/Linux or via NPM:
```bash
npm install -g supabase
```

## Step 2: Link to Your Project

```bash
# Navigate to your project directory
cd /path/to/your/claimsiq-project

# Link to your Supabase project
supabase link --project-ref lyppkkpawalcchbgbkxg
```

When prompted, enter your Supabase access token from:
https://app.supabase.com/account/tokens

## Step 3: Set OpenAI API Key Secret

### Option A: Via Supabase Dashboard (Recommended)
1. Go to https://app.supabase.com/project/lyppkkpawalcchbgbkxg/settings/vault
2. Click "New secret"
3. Name: `OPENAI_API_KEY`
4. Value: Your OpenAI API key (starts with `sk-`)
5. Click "Save"

### Option B: Via CLI
```bash
supabase secrets set OPENAI_API_KEY="sk-your-api-key-here"
```

## Step 4: Deploy Edge Functions

Deploy all four edge functions in order:

```bash
# Deploy FNOL extraction (converts PDF to images, extracts data)
supabase functions deploy fnol-extract

# Deploy Vision annotation (analyzes photos for damage)
supabase functions deploy vision-annotate

# Deploy Workflow generation (creates inspection checklists)
supabase functions deploy workflow-generate

# Deploy Daily optimization (optimizes routes and scheduling)
supabase functions deploy daily-optimize
```

## Step 5: Verify Deployment

Check that functions are deployed:
```bash
supabase functions list
```

You should see all four functions listed as "Active".

## Step 6: Test FNOL Upload

1. Build your iOS app on device or simulator
2. Navigate to a claim
3. Tap "Upload Document"
4. Select "FNOL" as document type
5. Pick a PDF file
6. Upload and extract

## Troubleshooting

### Error: "Edge function not deployed"
- Run the deployment commands in Step 4
- Verify with `supabase functions list`

### Error: "OPENAI_API_KEY not configured"
- Check secret exists: `supabase secrets list`
- Re-add if missing (Step 3)

### Error: "Failed to invoke function"
- Check your internet connection
- Verify Supabase project is active
- Check function logs: `supabase functions logs fnol-extract`

### Error: "PDF conversion failed"
- Ensure PDF is valid and not corrupted
- File size should be under 10MB
- Try with a simpler PDF first

## Function Details

### fnol-extract
- Converts PDFs to images using unpdf library
- Sends images to OpenAI Vision API
- Extracts structured claim data
- Updates database with extracted information

### vision-annotate
- Analyzes photos for damage detection
- Creates bounding boxes and severity ratings
- Generates damage descriptions
- Stores annotations in database

### workflow-generate
- Creates customized inspection checklists
- Based on claim type and damage
- Includes safety checks and requirements
- Stores workflow in database

### daily-optimize
- Optimizes route planning for multiple claims
- Considers travel time and priority
- Integrates weather conditions
- Updates daily schedule

## Support

If you encounter issues:
1. Check function logs: `supabase functions logs [function-name]`
2. Verify secrets: `supabase secrets list`
3. Test with curl: See testing commands in README.md

## Security Notes

- Never commit API keys to git
- Use environment variables for local development
- Rotate keys regularly
- Monitor usage in OpenAI dashboard