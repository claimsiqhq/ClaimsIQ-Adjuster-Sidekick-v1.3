# App Feature Status - Current Build vs After Rebuild

## 🔍 WHY TABS CRASH (Current Build)

Your current iPhone build was created BEFORE I added these npm packages:
- react-native-maps (Map tab)
- expo-document-picker (Document upload)
- @react-native-community/netinfo (Offline mode)
- expo-location (Weather/GPS)
- expo-sharing (Reports)
- react-native-pdf (PDF viewing)

When you tap these features → Module not found → CRASH

## ✅ What Works NOW (Current Build)

These work because they don't need new dependencies:
- ✅ Login/Authentication
- ✅ Home dashboard (basic stats from database)
- ✅ Settings (basic toggles)
- ✅ Claims list (search/view)
- ✅ Photo capture
- ✅ Photo viewing with AI annotations

## ❌ What Crashes NOW (Current Build)

These crash because dependencies are missing from build:
- ❌ Map tab → react-native-maps not installed
- ❌ Document upload → expo-document-picker not installed
- ❌ Report generation → expo-sharing not installed
- ❌ Weather → expo-location not installed
- ❌ Offline sync UI → @react-native-community/netinfo not installed
- ❌ LiDAR → Native modules not compiled

## ✅ What Will Work AFTER REBUILD

After running: eas build --platform ios --profile preview

ALL features will work:
- ✅ All tabs (no crashes!)
- ✅ Map with routing
- ✅ Document upload with FNOL extraction
- ✅ Report generation and sharing
- ✅ Weather integration
- ✅ Offline sync with indicators
- ✅ LiDAR scanning (with config plugin)
- ✅ Workflow generation
- ✅ Photo QC warnings

## 🎯 The Fix

OFFLINE MODE DOES NOT FIX CRASHES!

Offline mode helps when you have no internet, but the crashes are because:
- Native modules missing from build
- npm packages not compiled into app

YOU MUST REBUILD to fix crashes:
```bash
eas build --platform ios --profile preview
```

Then install the new build on your iPhone.
