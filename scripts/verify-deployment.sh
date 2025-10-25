#!/bin/bash
# Deployment Verification Script
# Checks if edge functions are deployed and working

set -e

echo "============================================"
echo "ClaimsIQ Deployment Verification"
echo "============================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Supabase CLI installed${NC}"

# Check if linked to project
echo ""
echo "Checking project link..."
if supabase projects list &> /dev/null; then
    echo -e "${GREEN}✓ Connected to Supabase${NC}"
else
    echo -e "${RED}✗ Not connected to Supabase. Run: supabase login${NC}"
    exit 1
fi

# List functions
echo ""
echo "Checking deployed functions..."
FUNCTIONS_OUTPUT=$(supabase functions list 2>&1 || echo "ERROR")

if [[ "$FUNCTIONS_OUTPUT" == *"ERROR"* ]] || [[ "$FUNCTIONS_OUTPUT" == *"not linked"* ]]; then
    echo -e "${RED}✗ Project not linked. Run: supabase link --project-ref lyppkkpawalcchbgbkxg${NC}"
    exit 1
fi

echo "$FUNCTIONS_OUTPUT"
echo ""

# Check each required function
REQUIRED_FUNCTIONS=("workflow-generate" "fnol-extract" "vision-annotate" "daily-optimize")
DEPLOYED_COUNT=0
MISSING_COUNT=0

echo "Verifying required functions..."
for func in "${REQUIRED_FUNCTIONS[@]}"; do
    if echo "$FUNCTIONS_OUTPUT" | grep -q "$func"; then
        echo -e "${GREEN}✓ $func${NC}"
        ((DEPLOYED_COUNT++))
    else
        echo -e "${RED}✗ $func (NOT DEPLOYED)${NC}"
        ((MISSING_COUNT++))
    fi
done

echo ""
echo "============================================"
echo "Summary"
echo "============================================"
echo -e "${GREEN}Deployed: $DEPLOYED_COUNT/4${NC}"
if [ $MISSING_COUNT -gt 0 ]; then
    echo -e "${RED}Missing: $MISSING_COUNT/4${NC}"
fi
echo ""

# Check secrets
echo "Checking secrets..."
SECRETS_OUTPUT=$(supabase secrets list 2>&1 || echo "ERROR")

if [[ "$SECRETS_OUTPUT" == *"OPENAI_API_KEY"* ]]; then
    echo -e "${GREEN}✓ OPENAI_API_KEY is set${NC}"
else
    echo -e "${RED}✗ OPENAI_API_KEY not set${NC}"
    echo "Set it with: supabase secrets set OPENAI_API_KEY=your_key"
fi

echo ""

# Final verdict
if [ $DEPLOYED_COUNT -eq 4 ] && [[ "$SECRETS_OUTPUT" == *"OPENAI_API_KEY"* ]]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ ALL SYSTEMS READY${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Edge functions are deployed and configured!"
    echo "Test by:"
    echo "1. Opening a claim in the app"
    echo "2. Tapping 'Generate Workflow'"
    echo "3. Waiting 10-15 seconds for AI generation"
    exit 0
else
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}⚠ SETUP INCOMPLETE${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "Next steps:"
    if [ $MISSING_COUNT -gt 0 ]; then
        echo "1. Deploy missing functions:"
        for func in "${REQUIRED_FUNCTIONS[@]}"; do
            if ! echo "$FUNCTIONS_OUTPUT" | grep -q "$func"; then
                echo "   supabase functions deploy $func --no-verify-jwt"
            fi
        done
    fi
    if [[ "$SECRETS_OUTPUT" != *"OPENAI_API_KEY"* ]]; then
        echo "2. Set OpenAI API key:"
        echo "   supabase secrets set OPENAI_API_KEY=your_key"
    fi
    exit 1
fi
