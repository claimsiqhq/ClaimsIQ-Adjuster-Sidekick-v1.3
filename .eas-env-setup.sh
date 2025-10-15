#!/bin/bash
# Setup EAS environment variables

echo "Setting up EAS environment variables..."

# Development environment
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://lyppkkpawalcchbgbkxg.supabase.co" --environment development --non-interactive --visibility plain 2>/dev/null || echo "EXPO_PUBLIC_SUPABASE_URL already exists or failed"
eas env:create --name EXPO_PUBLIC_SUPABASE_API_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzcxMjEsImV4cCI6MjA3NTk1MzEyMX0.g27leGoCVdfAQq0LhoXnI2N4nwu5LK3mPH0oE_MEzDs" --environment development --non-interactive --visibility plain 2>/dev/null || echo "EXPO_PUBLIC_SUPABASE_API_KEY already exists or failed"

# Preview environment
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://lyppkkpawalcchbgbkxg.supabase.co" --environment preview --non-interactive --visibility plain 2>/dev/null || echo "EXPO_PUBLIC_SUPABASE_URL already exists or failed"
eas env:create --name EXPO_PUBLIC_SUPABASE_API_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzcxMjEsImV4cCI6MjA3NTk1MzEyMX0.g27leGoCVdfAQq0LhoXnI2N4nwu5LK3mPH0oE_MEzDs" --environment preview --non-interactive --visibility plain 2>/dev/null || echo "EXPO_PUBLIC_SUPABASE_API_KEY already exists or failed"

echo "Done!"
