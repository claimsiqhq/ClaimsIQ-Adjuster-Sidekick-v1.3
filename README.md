# ClaimsIQ Sidekick - iOS Insurance Claims Inspection App

## Overview
ClaimsIQ Sidekick is a production-ready iOS application for insurance field adjusters built with React Native/Expo. It enables field adjusters to capture photos with AI-powered damage detection, extract data from FNOL PDFs, and manage claims with offline-first architecture.

**Target Platform:** iPhone (iOS only), optimized for iPhone 16 Pro Max  
**Build Type:** Expo Preview Builds (not development builds)  
**Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)

## Current Status (October 22, 2025)

### ✅ What's Working

#### UI/UX
- **All 6 tab layouts optimized** for iPhone 16 Pro Max with SafeAreaView
- **Tab Navigation**: Home, Today, Capture, Claims, Map, Settings
- **Offline-first architecture**: SQLite local database with sync capabilities
- **Authentication**: Email/password login with hardcoded credentials
- **Purple/pink brand theme** throughout the app

#### Backend Infrastructure
- **Supabase project configured** (`lyppkkpawalcchbgbkxg`)
- **Database tables created**: claims, media, documents, profiles, inspection_steps, etc.
- **Storage buckets ready**: media and documents buckets configured
- **Authentication working**: Supabase Auth with session persistence

### ⚠️ What Needs Deployment

#### Edge Functions (Required for AI Features)
The following edge functions are ready but **MUST be deployed to Supabase** for AI features to work:

1. **`fnol-extract`** - PDF to image conversion + FNOL data extraction
   - Now includes FREE PDF conversion using unpdf library (no paid APIs needed)
   - Automatically converts multi-page PDFs to images
   - Extracts claim data using OpenAI GPT-4o Vision

2. **`vision-annotate`** - Camera photo damage detection
   - Fixed response_format bug that was preventing photo capture
   - Detects damage and generates bounding boxes

3. **`daily-optimize`** - Route optimization for daily planning

4. **`workflow-generate`** - Dynamic inspection workflow generation

**Without these deployed, camera photos and PDF uploads will fail with edge function errors.**

### 🔴 Known Issues

#### Functional Issues
- **Camera photos fail** - Edge function not deployed
- **PDF extraction fails** - Edge function not deployed  
- **LiDAR disabled** - Was causing crashes, temporarily disabled
- **Map view disabled** - MapView removed to fix build errors, shows placeholder

#### UI Warnings (Cosmetic)
- Deprecated shadow props warnings in console
- pointerEvents deprecation warnings
- These don't affect functionality

## Setup Instructions for Developers

### 1. Prerequisites
- Node.js 18+ 
- Expo CLI (`npm install -g expo`)
- EAS CLI (`npm install -g eas-cli`)
- Supabase CLI (`npm install -g supabase`)
- iOS device or simulator (iPhone)
- Apple Developer account (for device builds)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

The app uses **hardcoded credentials** in `config/credentials.ts`:
```typescript
// Supabase (hardcoded for reliability)
SUPABASE_URL: 'https://lyppkkpawalcchbgbkxg.supabase.co'
SUPABASE_ANON_KEY: 'eyJhb...' // Full key in file

// Default test login
EMAIL: 'john@claimsiq.ai'
PASSWORD: 'admin123'
```

### 4. Deploy Edge Functions (CRITICAL)

```bash
# Link to your Supabase project
supabase link --project-ref lyppkkpawalcchbgbkxg

# Deploy all edge functions
supabase functions deploy fnol-extract
supabase functions deploy vision-annotate
supabase functions deploy daily-optimize
supabase functions deploy workflow-generate
```

### 5. Set Supabase Secrets

In Supabase Dashboard → Edge Functions → Manage Secrets:
- `OPENAI_API_KEY`: Your OpenAI API key (required)

### 6. Running Locally

```bash
# Start Expo dev server
npx expo start

# For iOS device/simulator
npx expo run:ios
```

### 7. Building for iPhone

```bash
# Create preview build for internal testing
npx eas build --profile preview --platform ios --clear-cache

# Download .ipa file and install via TestFlight or directly
```

## Project Structure

```
claimsiq-sidekick/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Main tab screens
│   │   ├── index.tsx      # Home tab
│   │   ├── capture.tsx    # Camera/gallery tab
│   │   ├── claims.tsx     # Claims list tab
│   │   ├── today.tsx      # Daily planning tab
│   │   ├── map.tsx        # Map view tab (placeholder)
│   │   └── settings.tsx   # Settings tab
│   ├── auth/              # Authentication screens
│   ├── claim/             # Claim detail screens
│   └── photo/             # Photo detail screens
├── services/              # API and business logic
│   ├── auth.ts           # Authentication
│   ├── claims.ts         # Claims management
│   ├── media.ts          # Photo/video handling
│   ├── documents.ts      # PDF upload/extraction
│   ├── sync.ts           # Offline sync
│   └── database.ts       # Local SQLite
├── supabase/
│   └── functions/        # Edge functions
│       ├── fnol-extract/ # PDF extraction (with conversion)
│       ├── vision-annotate/ # Photo AI
│       ├── daily-optimize/ # Route planning
│       └── workflow-generate/ # Workflow AI
├── config/
│   └── credentials.ts    # Hardcoded credentials
└── SUPABASE_SETUP.md    # Detailed Supabase setup guide
```

## Key Features

### 1. Photo Capture with AI
- Take photos → AI detects damage → Draws bounding boxes
- **Status**: UI complete, needs edge function deployment

### 2. FNOL PDF Processing  
- Upload PDF → Converts to images → Extracts claim data
- Uses FREE unpdf library for PDF conversion (no paid APIs)
- **Status**: UI complete, edge function updated with free PDF conversion

### 3. Offline-First Architecture
- Local SQLite database mirrors Supabase
- Background sync when online
- **Status**: Fully implemented

### 4. Daily Planning
- AI optimizes daily route based on claims
- Weather integration for safety
- **Status**: UI complete, needs edge function deployment

## Technology Stack

### Frontend
- React Native 0.76.5
- Expo SDK 54
- TypeScript (strict mode)
- Expo Router (file-based navigation)
- Zustand (state management)
- React Native Skia (annotation overlays)

### Backend
- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions (Deno runtime)
- OpenAI GPT-4o Vision API
- unpdf library (free PDF conversion)

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.39.8",
  "expo": "~54.0.0-preview.0",
  "expo-camera": "~16.1.0",
  "expo-sqlite": "^15.0.3",
  "expo-location": "~18.0.2",
  "react-native": "0.76.5",
  "zustand": "^4.4.7",
  "@shopify/react-native-skia": "1.9.0"
}
```

## Testing Credentials

```
Email: john@claimsiq.ai
Password: admin123
```

## Common Issues & Solutions

### "Edge function not deployed" Error
**Solution**: Deploy the edge functions using the Supabase CLI commands above

### Camera not working
**Solution**: Ensure vision-annotate function is deployed and OPENAI_API_KEY is set

### PDF extraction fails
**Solution**: Deploy fnol-extract function (includes free PDF conversion)

### Build errors with MapView
**Solution**: Already fixed - using placeholder map view

### LiDAR warnings
**Solution**: Already fixed - LiDAR feature disabled

## Database Schema

Key tables in Supabase:
- `claims` - Main claims data with metadata
- `media` - Photos/videos with AI annotations
- `documents` - PDFs with extracted data
- `profiles` - User profiles
- `inspection_steps` - Workflow steps
- `daily_optimizations` - Route planning
- `app_prompts` - Dynamic AI prompts

## Edge Functions Documentation

### fnol-extract
- **Purpose**: Extract data from FNOL PDFs
- **Features**: 
  - Automatic PDF to image conversion using unpdf (free)
  - Multi-page support (up to 10 pages)
  - GPT-4o Vision for data extraction
- **Required Secret**: OPENAI_API_KEY

### vision-annotate
- **Purpose**: Detect damage in photos
- **Features**:
  - Bounding box generation
  - Severity classification
  - Confidence scores
- **Required Secret**: OPENAI_API_KEY

### daily-optimize
- **Purpose**: Optimize daily routes
- **Features**:
  - Distance calculations
  - Weather integration
  - SLA tracking
- **Required Secret**: OPENAI_API_KEY

### workflow-generate
- **Purpose**: Generate inspection checklists
- **Features**:
  - Dynamic based on claim type
  - Step-by-step guidance
  - Evidence requirements
- **Required Secret**: OPENAI_API_KEY

## Support

For issues or questions:
- **Edge Functions**: Check SUPABASE_SETUP.md
- **Build Issues**: Ensure using preview profile, not development
- **Database**: All tables are pre-configured in Supabase

## License

Proprietary - ClaimsIQ 2025