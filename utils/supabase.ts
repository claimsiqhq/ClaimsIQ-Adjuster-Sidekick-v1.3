// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CREDENTIALS } from '@/config/credentials';

// Use environment variables first, fall back to embedded credentials for backward compatibility
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || APP_CREDENTIALS.supabase.url;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || APP_CREDENTIALS.supabase.anonKey;

// Validate that credentials are present
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file. ' +
    'See .env.example for reference.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
