# Migration Checklist

Use this checklist to complete the setup after code review fixes.

## ☑️ Code Changes (Already Done)
- [x] Theme colors file created
- [x] Component imports fixed
- [x] OpenAI API endpoint corrected
- [x] Database schema created
- [x] Hard-coded credentials removed
- [x] Duplicate files consolidated
- [x] Type safety improved
- [x] Claims screen connected to data
- [x] Settings switches functional
- [x] Documentation updated

## 📋 Required Actions

### 1. Install New Dependency
```bash
npm install
```
This installs `@react-native-async-storage/async-storage` for session persistence.

### 2. Run Database Migrations

Execute these SQL files **in order** in your Supabase SQL Editor:

1. ✅ `supabase/schema/prompts.sql` (if not already run)
2. ⚠️ **NEW:** `supabase/schema/claims.sql`
3. ⚠️ **NEW:** `supabase/schema/media_rls.sql`

**How to run:**
- Go to Supabase Dashboard → SQL Editor
- Copy contents of each file
- Execute
- Verify no errors

### 3. Update Environment Variables

Your `.env` file should now include (if not already present):

```bash
EXPO_PUBLIC_DEV_EMAIL=your-dev-email@example.com
EXPO_PUBLIC_DEV_PASSWORD=your-dev-password
```

### 4. Configure Edge Function Secret

In Supabase Dashboard → Edge Functions → Secrets, ensure:
```
OPENAI_API_KEY=sk-...
```
is set.

### 5. Redeploy Edge Function

The vision-annotate function has been updated with the correct API endpoint:

```bash
supabase functions deploy vision-annotate
```

### 6. Optional: Add App Assets

Add these files to `assets/images/`:
- `app-icon.png` (1024x1024)
- `splash.png` (2048x2048)

Or update `app.json` to reference your existing assets.

### 7. Test the Application

**Start the app:**
```bash
npx expo start
```

**Test these features:**
- [ ] Login (credentials now from .env)
- [ ] Photo capture
- [ ] AI annotation (with new OpenAI endpoint)
- [ ] Claims search
- [ ] Settings switches (should persist)
- [ ] Session persistence (logout and restart app)

### 8. Verify No Errors

```bash
npm run lint
```

Should return no errors (already verified).

## 🚨 Common Issues

### "Cannot find module '@/theme/colors'"
- Run `npx expo start -c` to clear cache
- Restart Metro bundler

### "Cannot find module '@react-native-async-storage/async-storage'"
- Run `npm install` again
- May need `npx expo prebuild` for native builds

### Session not persisting
- Verify AsyncStorage is installed
- Check that `utils/supabase.ts` has persistence enabled
- Clear app data and try again

### Vision annotation failing
- Verify OpenAI API key is set in Supabase secrets
- Check Edge Function logs in Supabase Dashboard
- Verify function was redeployed after code changes

### Database queries failing
- Ensure all migrations ran successfully
- Check RLS policies are enabled
- Verify user is authenticated

## ✅ Verification

Run this quick verification:

```bash
# 1. Dependencies installed
npm list @react-native-async-storage/async-storage

# 2. TypeScript compiles
npx tsc --noEmit

# 3. No lint errors
npm run lint

# 4. App starts
npx expo start
```

All should succeed ✅

## 📚 Reference Documents

- `CODE_REVIEW_FIXES_SUMMARY.md` - Complete list of all changes
- `ENV_SETUP.md` - Environment variable documentation  
- `README.md` - Full setup and development guide
- `assets/README.md` - Asset file requirements

## 🎉 Ready to Deploy

Once all items are checked:
- All database migrations run
- App starts without errors
- Tests pass
- Edge function deployed

You're ready for:
```bash
npx eas build --platform ios
npx eas build --platform android
```

---

**Questions?** Check the README.md troubleshooting section.

