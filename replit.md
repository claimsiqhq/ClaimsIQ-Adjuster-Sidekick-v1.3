# ClaimsiQ Sidekick

## Overview

ClaimsiQ Sidekick is a native iOS insurance claims inspection application built with React Native and Expo. The app enables field adjusters to capture and annotate photos with AI-powered damage detection, manage claims with offline-first architecture, and streamline the entire claims inspection workflow. The system leverages OpenAI Vision API for intelligent damage analysis and uses Supabase as the backend for data storage, authentication, and file management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54, TypeScript (strict mode), and Expo Router for file-based navigation.

**Navigation Structure**: Tab-based navigation with five main tabs (Home, Today, Capture, Claims, Map, Settings) plus modal screens for detailed views (photo details, claim details, document uploads, admin panels).

**State Management**: Zustand for global state (active claim selection) with local component state for UI interactions.

**Offline-First Design**: Local SQLite database mirrors remote Supabase data. All operations queue locally when offline and sync bidirectionally when connection is restored. The app uses `@react-native-community/netinfo` for network detection and maintains a sync queue table for pending operations.

**UI Components**: Custom component library with consistent theming (purple/pink brand colors). Reusable components include Header, Section, ThemedView, ThemedText, and specialized components for workflows, photo overlays, and sync status.

### Backend Architecture

**Database**: Supabase (PostgreSQL) with row-level security (RLS) policies for multi-tenant support. Core tables include claims, media, documents, profiles, inspection_steps, daily_optimizations, and app_prompts.

**Authentication**: Supabase Auth with email/password login. Sessions persist via AsyncStorage. Credentials are embedded in the app configuration for guaranteed connectivity (`config/credentials.ts`).

**File Storage**: Supabase Storage buckets for media (photos, LiDAR scans) and documents (PDFs, reports). Files are uploaded as base64-encoded ArrayBuffers with automatic public URL generation.

**Edge Functions**: Four Supabase Edge Functions handle AI processing:
- `vision-annotate`: OpenAI Vision API for damage detection in photos
- `fnol-extract`: FNOL data extraction from PDF documents
- `workflow-generate`: AI-generated inspection workflows
- `daily-optimize`: Route optimization and daily scheduling

### Data Synchronization

**Bidirectional Sync**: Push local changes to Supabase, then pull remote changes to local SQLite. Sync operations are queued with operation type (insert/update/delete), table name, record ID, and data payload.

**Conflict Resolution**: Last-write-wins strategy based on `updated_at` timestamps. Remote changes override local changes when timestamps indicate the remote version is newer.

**Sync Triggers**: Automatic background sync on app launch, manual sync via UI, and periodic background sync when online.

### AI Integration

**OpenAI Vision API**: Analyzes photos to detect damage, classify severity (minor/moderate/severe), and generate bounding box or polygon annotations. Results stored as JSON in the media table's `anno_json` field.

**Prompt Management**: Dynamic prompt system stored in `app_prompts` table allows versioning and A/B testing of AI instructions without app updates. Active prompts are fetched at runtime.

**FNOL Extraction**: PDF documents are processed server-side to extract claim data (policy numbers, dates, addresses, damage descriptions) using structured prompts and vision analysis.

### Location Services

**GPS Integration**: Expo Location API for capturing coordinates with photo metadata and claim locations. Supports geocoding addresses to coordinates and reverse geocoding coordinates to addresses.

**Weather Integration**: Weatherbit.io API provides current conditions, forecasts, and historical weather data for loss dates. Includes safety checks for roof inspections based on wind speed and precipitation.

**Route Optimization**: Calculates optimal daily routes using distance calculations and ETA estimates. Supports manual reordering and considers traffic/weather windows.

### Photo Processing Pipeline

**Capture Flow**: Camera → Local Save → Upload to Storage → Insert Media Record → Queue Annotation → Process with AI → Display Results

**Quality Control**: Blur detection, glare detection, exposure analysis, and distance hints stored in `photo_qc` JSON field.

**Annotation Overlay**: Skia Canvas renders bounding boxes and polygons over photos. Detections include labels, severity, confidence scores, and evidence descriptions.

### Workflow System

**Dynamic Workflows**: AI generates step-by-step inspection checklists based on claim type and damage. Steps include photo requirements, measurement tasks, document uploads, and notes.

**Evidence Validation**: Each step defines requirements (minimum photo count, required tags, GPS verification). Steps auto-complete when evidence meets criteria.

**Progress Tracking**: Real-time completion percentage, pending tasks, and next recommended actions displayed in checklist UI.

## External Dependencies

### Third-Party Services

**Supabase**: PostgreSQL database, authentication, storage buckets, and edge functions. Project URL: `https://lyppkkpawalcchbgbkxg.supabase.co`

**OpenAI API**: GPT-4 Vision for damage detection and data extraction. API key configured in Supabase Edge Function secrets.

**Weatherbit.io**: Weather data API for current conditions, forecasts, and historical data. API key configured via environment variable.

### Key NPM Packages

- `@supabase/supabase-js`: Supabase client SDK
- `expo-camera`: Camera functionality for photo capture
- `expo-location`: GPS and geocoding services
- `expo-sqlite`: Local SQLite database
- `expo-file-system`: File operations and base64 encoding
- `expo-secure-store`: Secure credential storage
- `@react-native-async-storage/async-storage`: Persistent key-value storage
- `@react-native-community/netinfo`: Network connectivity detection
- `drizzle-orm`: Type-safe ORM (configured but not actively used)
- `@shopify/react-native-skia`: Canvas rendering for annotations
- `zustand`: Lightweight state management

### Platform-Specific Features

**iOS-Only Build**: App targets iPhone devices exclusively with support for LiDAR scanning (temporarily disabled), camera access, location services, and secure keychain storage.

**Required Permissions**: Camera, microphone (voice notes), photo library (export), and location (when in use).

### Environment Configuration

**Build Profiles**: Development (internal distribution), preview (internal), and production builds configured in `eas.json`.

**Environment Variables**: Supabase URL and API key embedded directly in app configuration and EAS build profiles for maximum reliability. Weather and Google Maps API keys configured via `EXPO_PUBLIC_*` variables.

**Development Credentials**: Default login credentials (`john@claimsiq.ai` / `admin123`) embedded for testing and development builds.