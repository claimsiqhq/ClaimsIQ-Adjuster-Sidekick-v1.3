// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for crypto operations
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo bundles env vars with EXPO_PUBLIC_ prefix
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY;

// Check if environment variables are configured
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not configured!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY in your .env file');
  
  // Create a mock client that throws helpful errors
  const mockError = () => {
    throw new Error(
      'Supabase is not configured. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY to your environment variables.'
    );
  };
  
  export const supabase = {
    auth: {
      getSession: mockError,
      signOut: mockError,
      signInWithPassword: mockError,
      onAuthStateChange: () => ({ data: null, error: null, unsubscribe: () => {} }),
    },
    from: () => ({
      select: mockError,
      insert: mockError,
      update: mockError,
      delete: mockError,
      single: mockError,
    }),
    storage: {
      from: () => ({
        upload: mockError,
        download: mockError,
        getPublicUrl: mockError,
      }),
    },
  } as any;
} else {
  // Single client with session persistence enabled
  export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
