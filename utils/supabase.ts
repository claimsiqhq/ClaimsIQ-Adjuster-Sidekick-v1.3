// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for crypto operations
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo bundles env vars with EXPO_PUBLIC_ prefix
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY!;

// Single client with session persistence enabled
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
