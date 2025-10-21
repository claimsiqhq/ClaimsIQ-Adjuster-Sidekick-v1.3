// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for crypto operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get environment variables from multiple sources for maximum compatibility
// 1. Try Expo Constants (works in built apps)
// 2. Fall back to process.env (works in development)
const getEnvVar = (key: string): string | undefined => {
  // Try Expo config extra first (most reliable for builds)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  // Try manifest extra (older Expo versions)
  if ((Constants as any).manifest?.extra?.[key]) {
    return (Constants as any).manifest.extra[key];
  }
  // Fall back to process.env (development)
  return (process.env as any)[key];
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('EXPO_PUBLIC_SUPABASE_API_KEY');

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY are set in your Expo Dashboard or eas.json'
  );
}

// Single client with session persistence enabled
// Works with both new publishable keys (sb_publishable_) and legacy JWT keys
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
