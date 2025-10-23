# Supabase Production Database Setup

## How to Apply the Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (lyppkkpawalcchbgbkxg)
3. Go to **SQL Editor** in the left sidebar
4. Copy and paste the SQL from `database-schema.sql`
5. Click **Run** to execute

## The Schema Creates:
- `claims` table with proper columns and constraints
- `media` table for photos with AI annotation storage
- `documents` table for PDFs with extraction fields
- `inspection_steps` table for AI-generated workflows
- `app_prompts` table with default AI prompts
- All necessary indexes and triggers

## After Running the Schema:
Your production database will have all the tables the app expects, and you can:
- Upload FNOL PDFs
- Create claims
- Generate AI workflows
- Store photo annotations

## Edge Functions Required:
For the AI features to work, you need to deploy the Supabase Edge Functions:
- `fnol-extract` - Extracts data from PDFs
- `vision-annotate` - Detects damage in photos
- `workflow-generate` - Creates inspection workflows
- `daily-optimize` - Optimizes daily routes

These edge functions need the OpenAI API key configured in your Supabase project secrets.