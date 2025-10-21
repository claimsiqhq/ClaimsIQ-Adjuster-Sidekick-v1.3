// config/credentials.ts
// Embedded credentials for guaranteed app functionality

export const APP_CREDENTIALS = {
  supabase: {
    url: 'https://lyppkkpawalcchbgbkxg.supabase.co',
    anonKey: 'sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr',  // Your publishable key
  },
  defaultLogin: {
    email: 'john@claimsiq.ai',
    password: 'admin123',
  },
  apis: {
    openai: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
    weather: process.env.EXPO_PUBLIC_WEATHER_API_KEY || '',
    google: process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '',
  },
} as const;

