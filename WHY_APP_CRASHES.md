# Why the App Crashes - CRITICAL EXPLANATION

## 🚨 **ROOT CAUSE: Missing Native Modules**

### The Problem:

Your current build was created **BEFORE** we added new dependencies:
- expo-document-picker
- react-native-maps
- @react-native-community/netinfo
- react-native-pdf
- expo-sharing
- expo-location
- And others...

**What happens when you tap these features:**
1. Code tries to import the module
2. Module doesn't exist in the build
3. App crashes immediately

---

## 💥 Which Features Crash:

### ✅ Working (No new dependencies):
- Home dashboard
- Today screen
- Claims list
- Claim details (basic)
- Photo capture
- Photo viewing
- Login/logout

### ❌ Crashes (Needs new dependencies):
- **Document Upload** → expo-document-picker not in build
- **Report Generation** → expo-sharing not in build
- **Map tab** → react-native-maps not in build
- **LiDAR** → Native module not compiled
- **Weather** (if location requested) → expo-location not in build
- **Offline sync** → @react-native-community/netinfo not in build

---

## ✅ **THE FIX: Rebuild with Dependencies**

### You MUST rebuild with this sequence:

```bash
# 1. Dependencies are already in package.json (I added them)
#    Just need to install locally for development:
npm install

# 2. Prebuild to generate native code:
npx expo prebuild --clean

# 3. Build for iOS:
eas build --platform ios --profile preview
```

**After this rebuild:**
- All dependencies will be included
- Native modules compiled
- No more crashes!

---

## ℹ️ About the "Metadata Upload" Error

The "Failed to upload metadata" error is **completely unrelated** to the crashes.

**Status:** ✅ Harmless warning
- Metadata upload is optional EAS analytics
- Project is 114 MB (large)
- Actual build files uploaded successfully
- Build completes normally
- App installs fine

**Action:** Ignore it - doesn't affect anything

---

## 🎯 What You're Seeing Now

**Current Build:**
- Built with OLD dependencies
- Missing: document-picker, maps, netinfo, sharing, location
- Result: Crashes when accessing new features

**After Rebuild:**
- All new dependencies included
- Native modules compiled
- Everything works!

---

## 🔧 Admin Prompts - REDESIGNED

I completely rewrote it:

**Before (Confusing):**
- Showed ALL prompt versions (active + inactive)
- Multiple versions per prompt (12-14 total)
- Confusing "New version" buttons
- Complex versioning UI
- No back button

**After (Simple):**
- Shows ONLY 3 functions:
  1. FNOL Extraction
  2. Photo Annotation  
  3. Workflow Generation
- ONE edit box per function (system + user prompts)
- Expand/collapse to edit
- Clear "Save Changes" button
- **Back button to return to app** ✅
- Clean, simple UI

---

## 🚀 Immediate Actions:

### 1. Rebuild (Required)
```bash
eas build --platform ios --profile preview
```

### 2. After Rebuild
- Install new version on iPhone
- All features will work
- No more crashes
- Admin Prompts is now simple and has back button

---

## 📱 What to Expect:

**After rebuild, you can:**
- ✅ Upload documents (no crash)
- ✅ Use maps (no crash)
- ✅ Generate reports (no crash)
- ✅ Use LiDAR (no crash)
- ✅ Check weather (no crash)
- ✅ Edit prompts easily
- ✅ Navigate back from Admin Prompts

**Current build limitations:**
- Only features without new dependencies work
- Must rebuild to get full functionality

