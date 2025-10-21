// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CREDENTIALS } from '@/config/credentials';

// ALWAYS use embedded credentials for maximum reliability
const supabaseUrl = APP_CREDENTIALS.supabase.url;
const supabaseKey = APP_CREDENTIALS.supabase.anonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
