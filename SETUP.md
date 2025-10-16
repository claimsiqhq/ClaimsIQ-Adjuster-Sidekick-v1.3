# Claims iQ Sidekick - Setup Guide

## Quick Fix for Crashing Menu Items

The app crashes on certain menu items (Today, Capture, Claims, Map) because the Supabase environment variables are not configured.

### Solution:

1. **Create a `.env` file** in the project root:
   ```bash
   cp .env.example .env
   ```

2. **Add your Supabase credentials** to the `.env` file:
   ```env
   # Required for the app to work
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_API_KEY=your_supabase_anon_key
   
   # Optional - for weather features
   EXPO_PUBLIC_WEATHER_API_KEY=your_weather_api_key
   ```

3. **Get your Supabase credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project (or create a new one)
   - Go to Settings → API
   - Copy the `Project URL` and `anon public` key

4. **Restart the app**:
   ```bash
   # If using Expo Go
   expo start -c
   
   # If using development build
   npx expo run:ios
   # or
   npx expo run:android
   ```

## Why Were The Screens Crashing?

The app was trying to initialize the Supabase client with undefined environment variables. The code used the `!` operator to assert the variables existed, but they were actually `undefined`, causing crashes when screens tried to query the database.

## What Changed?

1. **Added proper error handling** in `utils/supabase.ts` to check if environment variables exist
2. **Added configuration checks** in screens that use Supabase (Today, Capture, Claims, Map)
3. **Added helpful error messages** that explain what needs to be configured
4. **Created `.env.example`** as a template for required environment variables

## Working Screens

These screens work without Supabase configuration:
- **Home** - Shows a dashboard (with mock data when Supabase is not configured)
- **Settings** - Local settings management
- **Explore** - Static help and documentation content

## Screens That Need Supabase

These screens require Supabase to be configured:
- **Today** - Loads claims data and schedules
- **Capture** - Stores photos and media in Supabase Storage
- **Claims** - Manages claims in the database
- **Map** - Loads claims with location data

## Optional Features

- **Weather API**: Add `EXPO_PUBLIC_WEATHER_API_KEY` from [WeatherAPI](https://www.weatherapi.com) to enable weather features on the Today screen
- **Development Login**: Add `EXPO_PUBLIC_DEV_EMAIL` and `EXPO_PUBLIC_DEV_PASSWORD` for quick development login

## Need Help?

If you're still experiencing crashes after configuration:
1. Make sure the `.env` file is in the project root
2. Clear the Metro cache: `expo start -c`
3. Check the console for specific error messages
4. Verify your Supabase project is active and not paused