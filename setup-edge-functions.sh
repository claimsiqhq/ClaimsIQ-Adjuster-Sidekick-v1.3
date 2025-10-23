#!/bin/bash

# Edge Functions Setup Script for ClaimsIQ Sidekick
# This script helps deploy edge functions to your Supabase project

echo "========================================="
echo "ClaimsIQ Sidekick - Edge Functions Setup"
echo "========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install Supabase CLI first:"
    echo "  macOS: brew install supabase/tap/supabase"
    echo "  npm:   npm install -g supabase"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're linked to a project
echo "Checking project link..."
if ! supabase status 2>/dev/null | grep -q "lyppkkpawalcchbgbkxg"; then
    echo "📎 Linking to your Supabase project..."
    echo ""
    echo "You'll need your Supabase access token from:"
    echo "https://app.supabase.com/account/tokens"
    echo ""
    supabase link --project-ref lyppkkpawalcchbgbkxg
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to link project"
        exit 1
    fi
else
    echo "✅ Already linked to project lyppkkpawalcchbgbkxg"
fi

echo ""
echo "Checking secrets..."

# Check if OPENAI_API_KEY is set
if supabase secrets list 2>/dev/null | grep -q "OPENAI_API_KEY"; then
    echo "✅ OPENAI_API_KEY secret found"
else
    echo "⚠️  OPENAI_API_KEY not found!"
    echo ""
    echo "Please add your OpenAI API key:"
    echo "1. Go to: https://app.supabase.com/project/lyppkkpawalcchbgbkxg/settings/vault"
    echo "2. Click 'New secret'"
    echo "3. Name: OPENAI_API_KEY"
    echo "4. Value: Your OpenAI API key (starts with sk-)"
    echo "5. Click 'Save'"
    echo ""
    read -p "Press Enter when you've added the secret, or Ctrl+C to exit..."
fi

echo ""
echo "Deploying edge functions..."
echo ""

# Deploy each function
functions=("fnol-extract" "vision-annotate" "workflow-generate" "daily-optimize")
failed=0

for func in "${functions[@]}"; do
    echo "📦 Deploying $func..."
    if supabase functions deploy $func; then
        echo "✅ $func deployed successfully"
    else
        echo "❌ Failed to deploy $func"
        failed=1
    fi
    echo ""
done

if [ $failed -eq 0 ]; then
    echo "========================================="
    echo "✅ All edge functions deployed!"
    echo "========================================="
    echo ""
    echo "Your FNOL upload feature should now work on iOS devices."
    echo ""
    echo "To test:"
    echo "1. Build your app for iOS"
    echo "2. Navigate to a claim"
    echo "3. Tap 'Upload Document'"
    echo "4. Select 'FNOL' and pick a PDF"
    echo "5. Upload and extract data"
else
    echo "========================================="
    echo "⚠️  Some functions failed to deploy"
    echo "========================================="
    echo ""
    echo "Check the error messages above and:"
    echo "1. Verify your Supabase project is active"
    echo "2. Check function logs: supabase functions logs [function-name]"
    echo "3. See DEPLOYMENT_GUIDE.md for troubleshooting"
fi