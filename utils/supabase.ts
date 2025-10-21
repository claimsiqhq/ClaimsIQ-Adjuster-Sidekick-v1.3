// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for crypto operations
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get environment variables - these come from Expo Dashboard or eas.json
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY;

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
