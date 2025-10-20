// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-get-random-values'; // Required for crypto operations
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_API_KEY?.trim();

export class SupabaseConfigurationError extends Error {
  missingKeys: string[];
  instructions: string;

  constructor(missingKeys: string[]) {
    const friendlyList = missingKeys.join(' and ');
    super(
      `Missing required Supabase environment ${missingKeys.length === 1 ? 'variable' : 'variables'}: ${friendlyList}. ` +
        'Create a local .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY to run the app.',
    );
    this.name = 'SupabaseConfigurationError';
    this.missingKeys = missingKeys;
    this.instructions =
      '1. Copy .env.example to .env in the project root.\n' +
      '2. Paste the Supabase Project URL into EXPO_PUBLIC_SUPABASE_URL.\n' +
      '3. Paste the Supabase anon public API key into EXPO_PUBLIC_SUPABASE_API_KEY.\n' +
      '4. Restart the Expo development server.';
  }
}

const missingKeys: string[] = [];
if (!SUPABASE_URL) {
  missingKeys.push('EXPO_PUBLIC_SUPABASE_URL');
}
if (!SUPABASE_KEY) {
  missingKeys.push('EXPO_PUBLIC_SUPABASE_API_KEY');
}

export const supabaseConfigError = missingKeys.length ? new SupabaseConfigurationError(missingKeys) : null;

const client: SupabaseClient = supabaseConfigError
  ? new Proxy({} as SupabaseClient, {
      get() {
        throw supabaseConfigError;
      },
      apply() {
        throw supabaseConfigError;
      },
    })
  : createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

export const supabase = client;

export const isSupabaseConfigured = !supabaseConfigError;

export function assertSupabaseConfigured(): void {
  if (supabaseConfigError) {
    throw supabaseConfigError;
  }
}
