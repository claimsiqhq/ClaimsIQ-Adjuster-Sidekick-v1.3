# Claims iQ Sidekick

A mobile insurance claims inspection app built with Expo, React Native, and Supabase. Features AI-powered photo annotation, claims management, and field inspection workflows.

## Features

- 📸 **Photo Capture & Management** - Camera integration with automatic AI annotation
- 🤖 **AI Vision** - OpenAI GPT-4 Vision for damage detection and assessment
- 📋 **Claims Tracking** - Search and manage insurance claims
- 🗄️ **Supabase Backend** - PostgreSQL database with real-time capabilities
- 🔐 **Authentication** - Secure user authentication with session persistence
- ⚙️ **Admin Panel** - Dynamic prompt management for AI models
- 🎨 **Modern UI** - Beautiful, responsive interface with custom components

## Prerequisites

- Node.js 18+ and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Supabase Account](https://supabase.com/)
- [OpenAI API Key](https://platform.openai.com/)
- iOS Simulator (Mac) or Android Emulator

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd <project-directory>
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (see `ENV_SETUP.md` for details):

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_API_KEY=your-anon-key-here

# Development Credentials (optional)
EXPO_PUBLIC_DEV_EMAIL=dev@example.com
EXPO_PUBLIC_DEV_PASSWORD=devpassword123
```

### 3. Set Up Supabase Database

#### Run Database Migrations

Execute the following SQL files in your Supabase SQL Editor (in order):

1. `supabase/schema/prompts.sql` - App prompts table
2. `supabase/schema/claims.sql` - Claims table with RLS
3. `supabase/schema/media_rls.sql` - Media table RLS policies

Note: `profiles`, `media`, and `app_settings` tables should already exist in your Supabase project.

#### Configure Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a public bucket named `media`
3. Set policies to allow authenticated users to upload/read

### 4. Set Up Supabase Edge Function

#### Configure Secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

```
OPENAI_API_KEY=sk-your-openai-api-key
```

#### Deploy Vision Annotate Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy vision-annotate
```

### 5. Add Assets (Optional)

Add the following images to `assets/images/`:
- `app-icon.png` (1024x1024)
- `splash.png` (2048x2048 or similar)

Or update `app.json` to reference your own icon/splash files.

### 6. Start Development Server

```bash
npx expo start
```

Press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web (limited support)

## Project Structure

```
.
├── app/                      # App screens (Expo Router)
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── capture.tsx      # Photo capture & gallery
│   │   ├── claims.tsx       # Claims list & search
│   │   ├── today.tsx        # Daily overview
│   │   ├── map.tsx          # Route planning
│   │   ├── settings.tsx     # User settings
│   │   └── explore.tsx      # Documentation
│   ├── admin/               # Admin screens
│   │   └── prompts.tsx      # Prompt management
│   ├── auth/                # Authentication
│   │   └── login.tsx        # Login screen
│   └── photo/[id].tsx       # Photo detail view
├── components/              # Reusable UI components
├── services/                # API service layer
│   ├── auth.ts              # Authentication
│   ├── claims.ts            # Claims CRUD
│   ├── media.ts             # Media/photo management
│   ├── prompts.ts           # Prompt management
│   └── annotate.ts          # AI annotation trigger
├── supabase/
│   ├── schema/              # Database migrations
│   └── functions/           # Edge functions
│       └── vision-annotate/ # AI vision processing
├── theme/                   # Design system
│   └── colors.ts            # Color palette
└── utils/                   # Utilities
    └── supabase.ts          # Supabase client

```

## Key Technologies

- **Expo 54** - React Native framework
- **Expo Router** - File-based routing
- **Supabase** - Backend as a Service (PostgreSQL, Auth, Storage, Edge Functions)
- **OpenAI GPT-4 Vision** - AI-powered image analysis
- **TypeScript** - Type-safe development
- **React Native Skia** - Hardware-accelerated graphics for annotations

## Development Workflow

### Running the App

```bash
# Development mode
npm start

# iOS
npm run ios

# Android
npm run android

# Lint
npm run lint
```

### Database Migrations

1. Create SQL file in `supabase/schema/`
2. Run in Supabase SQL Editor or via CLI:
   ```bash
   supabase db push
   ```

### Testing Edge Functions Locally

```bash
supabase functions serve vision-annotate --env-file .env
```

## Common Issues

### Session Persistence Not Working

- Ensure `@react-native-async-storage/async-storage` is installed
- Run `npx expo prebuild` to regenerate native projects

### Camera Not Working

- iOS: Check `Info.plist` has camera permissions
- Android: Check `AndroidManifest.xml` has camera permissions
- Restart Metro bundler after permission changes

### Environment Variables Not Loading

- Restart the Expo dev server after changing `.env`
- Variables must be prefixed with `EXPO_PUBLIC_`

### Build Failures

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Expo cache
npx expo start -c
```

## Deployment

### Build for iOS/Android

```bash
# Configure EAS Build
npx eas build:configure

# Build for iOS
npx eas build --platform ios

# Build for Android
npx eas build --platform android
```

### Submit to App Stores

```bash
# iOS App Store
npx eas submit --platform ios

# Google Play Store
npx eas submit --platform android
```

## Contributing

See `CONTRIBUTIONS.md` for guidelines.

## Support

For issues or questions:
1. Check the [Expo documentation](https://docs.expo.dev/)
2. Check the [Supabase documentation](https://supabase.com/docs)
3. Open an issue in this repository

## License

[Your License Here]
