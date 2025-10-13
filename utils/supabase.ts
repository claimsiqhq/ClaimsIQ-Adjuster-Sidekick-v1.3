// File: utils/supabase.ts

import { createClient } from '@supabase/supabase-js';

// Load environment variables (Expo inlines EXPO_PUBLIC_ vars at build time)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY!;

// Initialize the Supabase client with the publishable (public) API key
export const supabase = createClient(supabaseUrl, supabaseKey);
