# Build Instructions - Complete App

## 🚀 Steps to Build the Complete App

### 1. Install Dependencies

```bash
npm install expo-document-picker expo-sharing react-native-pdf expo-image-manipulator @react-native-community/netinfo drizzle-orm react-native-maps expo-location
```

### 2. Prebuild Native Code

```bash
npx expo prebuild
```

This generates iOS and Android native projects with all the required configurations.

### 3. Deploy Edge Functions

Deploy the FNOL extraction function to Supabase:

```bash
npx supabase functions deploy fnol-extract
```

Verify it's deployed:
```bash
npx supabase functions list
```

### 4. Configure Edge Function Secrets

In Supabase Dashboard → Edge Functions → Secrets, ensure these are set:
- `OPENAI_API_KEY` - Your OpenAI API key

### 5. Verify Storage Buckets

Ensure these buckets exist in Supabase Storage:
- ✅ `media` - For photos (public)
- ✅ `documents` - For PDFs/docs (public)

### 6. Build for iOS

```bash
eas build --platform ios --profile preview
```

This will:
- Include all Supabase credentials
- Bundle the complete app
- Create a standalone build
- Generate install link for your iPhone

### 7. Install on Device

1. Open the install link/QR code on your iPhone
2. Install the app
3. Login: `john@claimsiq.ai` / `admin123`

---

## ✅ What You'll Get

### Complete FNOL Workflow
1. Tap any claim
2. Tap "Upload Document"
3. Select FNOL PDF
4. AI extracts all data automatically
5. Claim fields auto-populate
6. View extracted data

### Document Management
- Upload PDFs, images
- View in-app
- Track extraction status
- Delete when needed

### Offline Support
- Work without internet
- Changes queued
- Auto-sync when connected
- See pending changes

### Report Generation
- Generate professional reports
- Include photos & annotations
- Include FNOL data
- Share via email/messages

### Complete Navigation
- 7 functional tabs
- Claim details
- Document viewer
- Report generator
- All connected

---

## 🔧 Troubleshooting

### If Build Fails

**Error: Module not found**
```bash
rm -rf node_modules package-lock.json
npm install
npx expo prebuild --clean
```

**Error: Pod install failed (iOS)**
```bash
cd ios
pod install
cd ..
```

**Error: Expo dev client**
- Make sure you're using `--profile preview` not `development`

### If Functions Don't Deploy

**Not logged in:**
```bash
npx supabase login
```

**Not linked to project:**
```bash
npx supabase link --project-ref lyppkkpawalcchbgbkxg
```

---

## 📱 Testing the App

### Test FNOL Processing:
1. Create a test claim
2. Upload a sample FNOL PDF
3. Wait for extraction (10-20 seconds)
4. Check claim details - fields should auto-populate
5. View document - see extracted JSON

### Test Offline Mode:
1. Enable airplane mode
2. Capture photos
3. Edit claim
4. Disable airplane mode
5. Check Settings → Sync Status
6. Tap "Sync Now"
7. Verify changes uploaded

### Test Reports:
1. Open any claim with photos
2. Tap "Generate Report"
3. Select options
4. Tap "Generate & Share"
5. Share via email or messages

---

## 🎉 You're Ready!

The app is now production-ready for field testing with:
- Complete FNOL AI extraction
- Full offline support
- Document management
- Report generation
- Professional UI/UX
- Error handling

Just install the dependencies and rebuild!

