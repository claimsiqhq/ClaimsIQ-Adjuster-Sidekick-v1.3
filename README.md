# ClaimsiQ Sidekick

A native iOS insurance claims inspection app built with React Native (Expo) for iPhone devices.

## Overview

ClaimsiQ Sidekick streamlines the insurance claims inspection process by enabling field adjusters to:
- Capture and annotate photos with AI-powered damage detection
- Manage claims with offline-first architecture
- Access location-based claim information
- Track daily activities and workflows

## Tech Stack

- **Frontend**: React Native + Expo SDK 54
- **Language**: TypeScript (strict mode)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI Vision API for damage detection
- **Platform**: iOS (iPhone only)

## Features

### Core Functionality
- 📸 Photo capture with AI annotation
- 🔍 Damage detection using OpenAI Vision
- 📋 Claims list management
- 📍 Map-based claims view
- 📅 Daily activity tracking
- ⚙️ Settings and admin controls

### Technical Features
- Offline-first architecture with local SQLite
- Secure credential storage using iOS Keychain
- Real-time sync with Supabase backend
- Dynamic AI prompt management system
- Row-level security for multi-tenant support

## Project Structure

```
.
├── app/                 # Expo Router pages
│   ├── (tabs)/         # Tab navigation screens
│   ├── auth/           # Authentication screens
│   ├── admin/          # Admin screens
│   └── photo/          # Photo detail views
├── components/         # Reusable UI components
├── services/           # Business logic and API services
├── utils/              # Utility functions
├── theme/              # Design system and colors
└── supabase/           # Backend functions and schema
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- iPhone (physical device)
- Expo Go app from the App Store
- Supabase account for backend

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure the required environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and paste the credentials from your Supabase project (Dashboard → Project Settings → API):

   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_API_KEY=your_supabase_anon_key
   EXPO_PUBLIC_WEATHER_API_KEY=your_weatherapi_com_api_key
   ```

   > ℹ️ If these variables are missing the app now displays a friendly configuration screen instead of crashing.

3. Start the development server:
```bash
npx expo start
```

4. Open Expo Go on your iPhone and scan the QR code

### Building for Production

Create a standalone iOS app:
```bash
# Configure EAS Build
npx eas build:configure

# Build for iOS
npx eas build --platform ios --profile production

# Submit to TestFlight
npx eas submit --platform ios
```

### Refreshing native modules for development devices

Some tabs (Map, Capture, Claims, Today) rely on native packages such as `react-native-maps`, `expo-document-picker`, and the custom LiDAR scanner. Whenever those dependencies change you must produce a fresh native build before testing on a physical device:

```bash
eas build --platform ios --profile preview
```

Install the resulting `.ipa` on your device (the EAS CLI will display a download link or QR code). Running an outdated build will crash as soon as the JavaScript bundle attempts to load a module that is missing from the native binary.

## Database Setup

### SQL Migrations

Run these in your Supabase SQL Editor (in order):
1. `supabase/schema/claims.sql` - Claims table structure
2. `supabase/schema/media_rls.sql` - Media security policies  
3. `supabase/schema/prompts.sql` - AI prompt versioning

### Edge Function Deployment

Deploy the AI vision function:
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy vision-annotate
```

Set the OpenAI API key in Supabase Dashboard → Edge Functions → Secrets:
```
OPENAI_API_KEY=your_openai_api_key
```

### Storage Configuration

1. Go to Supabase Dashboard → Storage
2. Create a public bucket named `media`
3. Set policies to allow authenticated users to upload/read

## App Configuration

### Required Assets

Add to `.assets/images/`:
- `app-icon.png` - App icon (1024x1024)
- `splash.png` - Splash screen image

### Configuration Files
- `app.json` - Expo and iOS-specific settings
- `eas.json` - Build configuration for EAS
- `tsconfig.json` - TypeScript configuration

### Weather API Setup

The Today screen displays local weather conditions and safety guidance by calling [WeatherAPI.com](https://www.weatherapi.com/). Generate an API key from your chosen provider and populate `EXPO_PUBLIC_WEATHER_API_KEY` in `.env`. Without this variable the app will surface a notice explaining why weather insights are unavailable.

### iOS Permissions

The app requests these permissions (configured in `app.json`):
- Camera - For photo capture
- Microphone - For voice notes
- Photo Library - For saving reports

## Development Workflow

### Running on iPhone

1. Install Expo Go from the App Store
2. Start dev server: `npx expo start`
3. Scan QR code with Expo Go
4. App reloads automatically on file changes

### Code Guidelines

- TypeScript strict mode enforced
- Functional components with React Hooks
- File-based routing with expo-router
- Service layer pattern for business logic
- iOS Keychain for secure storage

### Testing

```bash
# Run tests
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## Theme Configuration

The app uses a purple/pink color scheme defined in `theme/colors.ts`:
- Primary: #7C3AED (Purple)
- Secondary: #EC4899 (Pink)
- Background: #F0E6FA (Light purple)

## Troubleshooting

### Build Errors

```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json
npm install
npx expo start -c
```

### The app shows a configuration error screen

The Supabase client cannot start because the required environment variables are missing. Follow the on-screen instructions or run:

```bash
cp .env.example .env
```

Then paste `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_API_KEY` from the Supabase dashboard and restart Expo.

### Expo Go Connection Issues

1. Ensure iPhone and development machine are on same network
2. Check firewall settings
3. Try using tunnel mode: `npx expo start --tunnel`

### iOS-Specific Issues

- Restart Expo Go app
- Clear Expo Go cache in app settings
- Ensure iOS version is compatible (iOS 13+)

## Project Details

- **Bundle ID**: com.claimsiq.claimsiqadjustersidekickv13
- **EAS Project ID**: 31e9a2f0-7c90-41af-bdf1-f3e53d0e75dd
- **Owner**: claimsiq

## License

Proprietary - ClaimsiQ

## Support

For support, contact the ClaimsiQ development team.
