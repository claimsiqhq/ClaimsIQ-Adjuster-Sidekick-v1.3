// config/credentials.ts
// Embedded credentials for guaranteed app functionality

export const APP_CREDENTIALS = {
  supabase: {
    url: 'https://lyppkkpawalcchbgbkxg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cHBra3Bhd2FsY2NoYmdia3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNzcxMjEsImV4cCI6MjA3NTk1MzEyMX0.g27leGoCVdfAQq0LhoXnI2N4nwu5LK3mPH0oE_MEzDs',
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

