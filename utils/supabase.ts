// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for crypto operations
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo bundles env vars with EXPO_PUBLIC_ prefix
// Fallback to hardcoded values for EAS builds
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lyppkkpawalcchbgbkxg.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzcxMjEsImV4cCI6MjA3NTk1MzEyMX0.g27leGoCVdfAQq0LhoXnI2N4nwu5LK3mPH0oE_MEzDs';

// Single client with session persistence enabled
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
