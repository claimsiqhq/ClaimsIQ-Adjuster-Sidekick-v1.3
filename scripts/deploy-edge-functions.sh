#!/bin/bash
# Edge Functions Deployment Script for ClaimsIQ Adjuster Sidekick
# This script deploys all required edge functions to Supabase

set -e  # Exit on error

echo "======================================"
echo "ClaimsIQ Edge Functions Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}ERROR: Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠ OPENAI_API_KEY not found in environment${NC}"
    read -p "Enter your OpenAI API key: " OPENAI_API_KEY
    if [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}ERROR: OpenAI API key is required${NC}"
        exit 1
    fi
fi

# Link to Supabase project
echo ""
echo "Step 1: Linking to Supabase project..."
echo "Project ref: lyppkkpawalcchbgbkxg"

if ! supabase link --project-ref lyppkkpawalcchbgbkxg; then
    echo -e "${RED}ERROR: Failed to link to Supabase project${NC}"
    echo "Make sure you're logged in: supabase login"
    exit 1
fi

echo -e "${GREEN}✓ Project linked${NC}"

# Set secrets
echo ""
echo "Step 2: Setting secrets..."

if supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"; then
    echo -e "${GREEN}✓ OPENAI_API_KEY set${NC}"
else
    echo -e "${RED}ERROR: Failed to set OPENAI_API_KEY${NC}"
    exit 1
fi

# Deploy edge functions
echo ""
echo "Step 3: Deploying edge functions..."
echo ""

FUNCTIONS=(
    "workflow-generate:Workflow Generation (AI-powered inspection steps)"
    "fnol-extract:FNOL PDF Extraction (PDF to structured data)"
    "vision-annotate:Photo Damage Detection (AI vision analysis)"
    "daily-optimize:Daily Route Optimization (AI planning)"
)

DEPLOYED=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
    IFS=':' read -r name description <<< "$func"

    echo "Deploying $name..."
    echo "  Purpose: $description"

    if supabase functions deploy "$name" --no-verify-jwt; then
        echo -e "${GREEN}✓ $name deployed successfully${NC}"
        ((DEPLOYED++))
    else
        echo -e "${RED}✗ $name deployment failed${NC}"
        ((FAILED++))
    fi
    echo ""
done

# Summary
echo "======================================"
echo "Deployment Summary"
echo "======================================"
echo -e "${GREEN}Deployed: $DEPLOYED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
echo ""

# List deployed functions
echo "Listing deployed functions:"
supabase functions list

# Test endpoints
echo ""
echo "======================================"
echo "Testing Edge Functions"
echo "======================================"
echo ""

echo "To test workflow generation:"
echo "1. Open the app and create/open a claim"
echo "2. Navigate to the claim detail screen"
echo "3. Tap 'Generate Workflow' button"
echo "4. Workflow steps should appear within 10-15 seconds"
echo ""

echo "To test FNOL extraction:"
echo "1. Go to Claims tab"
echo "2. Tap 'Upload FNOL' button"
echo "3. Select a PDF file"
echo "4. Wait for extraction to complete"
echo ""

echo "To test photo annotation:"
echo "1. Go to Capture tab"
echo "2. Take or select a photo"
echo "3. Photo will be annotated automatically"
echo "4. View annotations in photo detail"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All edge functions deployed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Restart your Expo development server"
    echo "2. Test each function as described above"
    echo "3. Check Supabase logs for any errors"
    exit 0
else
    echo -e "${YELLOW}⚠ Some deployments failed. Check errors above.${NC}"
    exit 1
fi
