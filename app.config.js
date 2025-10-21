// app.config.js - Dynamic configuration for Expo
export default ({ config }) => {
  // Environment variables that should be available in the app
  const envVars = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://lyppkkpawalcchbgbkxg.supabase.co",
    EXPO_PUBLIC_SUPABASE_API_KEY: process.env.EXPO_PUBLIC_SUPABASE_API_KEY || "sb_publishable_xG1vNYVo-wpyHi4WzCdUGg_9XFL8Gxr"
  };

  return {
    ...config,
    extra: {
      ...config.extra,
      ...envVars,
      // Make env vars also available under an env key for clarity
      env: envVars
    }
  };
};