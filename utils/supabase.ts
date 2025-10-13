// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Expo bundles env vars with EXPO_PUBLIC_ prefix
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY!;

// Single client used across the app
export const supabase = createClient(supabaseUrl, supabaseKey);

// If/when you add Supabase Auth with session persistence on RN, uncomment:
/*
import 'expo-sqlite/localStorage/install';
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
*/
