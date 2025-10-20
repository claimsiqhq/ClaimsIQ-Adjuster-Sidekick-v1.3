# Build Instructions for iPhone Installation

## ✅ Issues Fixed

1. **Native iOS Code Integration** - Fixed bridging header path for LiDAR scanner
2. **Device Compatibility** - Removed ARKit requirement so app works on all iPhones
3. **Environment Variables** - Added Supabase credentials to all EAS build profiles
4. **Error Handling** - Updated error boundaries and removed configuration assertions

## 🚀 How to Build and Install on Your iPhone

### Step 1: Create a New Development Build
Since the app includes custom native iOS code (LiDAR Scanner), you need a custom development client:

```bash
npx eas build --profile development --platform ios
```

### Step 2: Wait for Build to Complete
- The build will take about 10-15 minutes in EAS cloud servers
- You'll receive an email when it's ready
- Or check status at: https://expo.dev/accounts/claimsiq/projects/claimsiq-adjuster-sidekick-v13/builds

### Step 3: Install on Your iPhone
1. When the build completes, you'll get a QR code or link
2. Open the link on your iPhone
3. Install the app (you may need to trust the developer certificate in Settings > General > Device Management)

## 📱 What's Different Now

Your previous build was missing:
- Environment variables for Supabase connection
- Proper native code integration
- Device compatibility settings

The new build includes all these fixes and should work properly on your iPhone.

## 🔧 Local Development

For local development with Expo Go or development server:
```bash
npm start
```

## 📝 Environment Variables

The following are now included in your EAS builds:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_API_KEY`: Your Supabase anonymous key

These are configured in:
- `.env` file (local development)
- `eas.json` (EAS builds)
- Expo dashboard (alternative to eas.json)

## ⚠️ Important Notes

1. **Custom Native Code**: This app includes custom iOS native modules that require a development build
2. **No Expo Go**: You cannot use Expo Go for this app due to native code
3. **Device Trust**: First time installing, you'll need to trust the developer certificate on your iPhone

## 🆘 Troubleshooting

If the app still crashes:
1. Make sure you're using the NEW build created after these fixes
2. Check that your iPhone is running iOS 15.0 or later
3. Verify the developer certificate is trusted in Settings
4. Try deleting the old app before installing the new build

## 🏗️ Build Configuration

The app is configured with:
- **Project ID**: 31e9a2f0-7c90-41af-bdf1-f3e53d0e75dd
- **Bundle ID**: com.claimsiq.claimsiqadjustersidekickv13
- **Owner**: claimsiq
- **iOS Deployment Target**: 15.0