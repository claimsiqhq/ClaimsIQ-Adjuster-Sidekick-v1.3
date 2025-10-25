// config/credentials.ts
// Configuration for app credentials
// IMPORTANT: Set these in your .env file instead of hardcoding them here
// See .env.example for reference

export const APP_CREDENTIALS = {
  supabase: {
    // Fallback values for backward compatibility - replace with your actual values or use .env
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lyppkkpawalcchbgbkxg.supabase.co',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr',
  },
  defaultLogin: {
    // Default test credentials - DO NOT use in production!
    email: process.env.EXPO_PUBLIC_DEFAULT_EMAIL || 'john@claimsiq.ai',
    password: process.env.EXPO_PUBLIC_DEFAULT_PASSWORD || 'admin123',
  },
  apis: {
    openai: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    weather: process.env.EXPO_PUBLIC_WEATHER_API_KEY || '',
    google: process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '',
  },
} as const;

