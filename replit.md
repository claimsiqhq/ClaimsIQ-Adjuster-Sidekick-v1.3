# Overview

Claims iQ Sidekick is a native iOS insurance claims inspection application built with Expo (React Native) specifically for iPhone devices. The app enables field adjusters to capture photos, manage claims, and leverage AI-powered damage detection through OpenAI's Vision API. It features offline-first architecture with Supabase backend integration, supporting camera capture, AI annotation workflows, claims tracking, and administrative prompt management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Platform:**
- Expo SDK 54+ with React Native 0.81.4
- TypeScript strict mode enabled (`tsconfig.json` with `"strict": true`)
- File-based routing via `expo-router` v6
- iOS-only (iPhone), not supporting web or Android platforms
- Uses Expo Secure Store for iOS Keychain integration

**UI & Design Patterns:**
- Functional components exclusively using React Hooks (useState, useEffect, useMemo)
- Custom theme system with centralized color palette (`theme/colors.ts`)
- Purple/pink brand colors (#7C3AED primary, #EC4899 secondary)
- Tab-based navigation with 6 main sections: Home, Capture, Claims, Today, Map, Settings
- Platform-specific icons: SF Symbols (iOS) via `expo-symbols`, Ionicons fallback for Android/web

**State Management:**
- Local component state via React Hooks
- Session persistence through `@react-native-async-storage/async-storage`
- Settings stored in AsyncStorage with toggle-based UI controls
- No global state management library (Redux/Zustand) currently implemented

**Key Libraries:**
- `@shopify/react-native-skia` for canvas-based photo overlay rendering
- `expo-camera` for photo capture
- `expo-secure-store` for sensitive credential storage (iOS Keychain)
- `react-native-reanimated` for animations

## Backend Architecture

**Database & BaaS:**
- Supabase PostgreSQL with Row-Level Security (RLS)
- Real-time capabilities enabled
- Tables: `claims`, `media`, `app_prompts`, `user_profiles`
- Session management with auto-refresh tokens

**Authentication:**
- Supabase Auth with email/password
- Auto-login support for development via environment variables
- Session persistence across app restarts
- Protected routes with redirect to `/auth/login` if unauthenticated

**Data Services Pattern:**
- Service layer architecture (`services/*.ts` modules)
- Separation: UI components → service functions → Supabase client
- Key services:
  - `auth.ts` - Authentication, user profiles, session management
  - `media.ts` - Photo/media CRUD, status tracking, annotation data
  - `claims.ts` - Claims search and management
  - `prompts.ts` - Dynamic AI prompt versioning system
  - `annotate.ts` - Edge function invocation wrapper

**Media Pipeline:**
1. Photo capture → Local storage
2. Upload to Supabase Storage (public bucket)
3. Create media record with status='uploading'
4. Invoke Edge Function for AI annotation
5. Update record with detections, QC data, status='done'

## AI Integration

**OpenAI Vision API:**
- GPT-4 Vision model for damage detection
- Edge Function: `supabase/functions/vision-annotate/index.ts`
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Dynamic prompt system sourced from `app_prompts` table
- Template variable substitution (e.g., `{{SCENE_TAGS}}`)

**Annotation Output Structure:**
```typescript
{
  detections: Detection[];  // Bounding boxes or polygons
  photo_qc?: {             // Quality metrics
    blur_score?: number;
    glare?: boolean;
    underexposed?: boolean;
  };
  model?: { name: string; ts: string };
}
```

**Photo Overlay Rendering:**
- Skia Canvas for performance
- Color-coded severity (severe=red, moderate=orange, minor=blue)
- Supports both bbox and polygon shapes
- Toggle visibility in photo detail view

## External Dependencies

**Third-Party Services:**
- **Supabase** - PostgreSQL database, authentication, storage, edge functions
  - Connection via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_API_KEY`
  - Edge function secrets: `OPENAI_API_KEY`
- **OpenAI** - GPT-4 Vision API for damage detection and annotation
  - Consumed via Supabase Edge Function
  - Requires API key in function secrets

**Cloud Storage:**
- Supabase Storage buckets for media files
- Public URL generation for image access
- RLS policies control media access per organization/user

**Development Tools:**
- EAS (Expo Application Services) for builds
- Project ID: `31e9a2f0-7c90-41af-bdf1-f3e53d0e75dd`
- Owner: `claimsiq`

**Database Schema:**
- Migration files in `supabase/schema/`:
  - `prompts.sql` - Dynamic AI prompt versioning
  - `claims.sql` - Claims table structure
  - `media_rls.sql` - Row-level security policies
- Requires manual execution in Supabase SQL Editor

**Environment Configuration:**
- `.env` file for Expo public variables (prefix: `EXPO_PUBLIC_`)
- Development credentials for auto-fill during testing
- Never committed to version control (`.gitignore` enforced)