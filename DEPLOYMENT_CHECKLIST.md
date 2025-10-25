# ClaimsIQ Deployment Checklist

Complete checklist for deploying ClaimsIQ to production. Follow this step-by-step guide to ensure a smooth deployment.

---

## 📋 Pre-Deployment Checklist

### 1. Code Preparation

- [ ] **Replace old screens with improved versions**
  ```bash
  # Home screen
  mv app/(tabs)/index.tsx app/(tabs)/index-OLD.tsx
  mv app/(tabs)/index-IMPROVED.tsx app/(tabs)/index.tsx

  # Claims screen
  mv app/(tabs)/claims.tsx app/(tabs)/claims-OLD.tsx
  mv app/(tabs)/claims-IMPROVED.tsx app/(tabs)/claims.tsx

  # Capture screen
  mv app/(tabs)/capture.tsx app/(tabs)/capture-OLD.tsx
  mv app/(tabs)/capture-IMPROVED.tsx app/(tabs)/capture.tsx

  # Settings screen
  mv app/(tabs)/settings.tsx app/(tabs)/settings-OLD.tsx
  mv app/(tabs)/settings-IMPROVED.tsx app/(tabs)/settings.tsx
  ```

- [ ] **Install all required dependencies**
  ```bash
  npm install expo-image-manipulator expo-print expo-sharing
  npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
  npm install --save-dev detox
  ```

- [ ] **Update package.json scripts**
  ```json
  {
    "scripts": {
      "test": "jest",
      "test:watch": "jest --watch",
      "test:coverage": "jest --coverage",
      "test:integration": "jest --testMatch='**/__tests__/integration/**/*.test.ts'",
      "detox:build:ios": "detox build --configuration ios.sim.release",
      "detox:test:ios": "detox test --configuration ios.sim.release",
      "detox:build:android": "detox build --configuration android.emu.release",
      "detox:test:android": "detox test --configuration android.emu.release",
      "lint": "eslint ."
    }
  }
  ```

### 2. Environment Variables

- [ ] **Create production `.env` file**
  ```bash
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_API_KEY=your-anon-key
  GEMINI_API_KEY=your-gemini-api-key
  SENTRY_DSN=your-sentry-dsn
  ```

- [ ] **Configure EAS secrets**
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_API_KEY --value "your-anon-key"
  eas secret:create --scope project --name GEMINI_API_KEY --value "your-gemini-api-key"
  eas secret:create --scope project --name SENTRY_DSN --value "your-sentry-dsn"
  ```

- [ ] **Verify all secrets are set**
  ```bash
  eas secret:list
  ```

---

## 🗄️ Database Setup

### 3. Deploy Database Migrations

- [ ] **Review all migrations**
  ```bash
  ls -la supabase/migrations/
  ```

  Should see:
  - `20250125_improved_rls_policies.sql`
  - `20250125_user_settings_and_analytics.sql`

- [ ] **Deploy to Supabase (LOCAL FIRST)**
  ```bash
  # Test locally first
  npx supabase db reset  # Fresh start
  npx supabase db push   # Apply migrations
  ```

- [ ] **Verify local deployment**
  ```bash
  npx supabase db diff   # Should show no differences
  ```

- [ ] **Deploy to PRODUCTION**
  ```bash
  npx supabase link --project-ref your-project-id
  npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres"
  ```

- [ ] **Verify production tables exist**
  - Go to Supabase Dashboard → Table Editor
  - Confirm: `profiles`, `user_settings`, `analytics_events` exist
  - Check RLS policies are enabled

### 4. Deploy Edge Functions

- [ ] **Make scripts executable**
  ```bash
  chmod +x scripts/deploy-edge-functions.sh
  chmod +x scripts/verify-deployment.sh
  ```

- [ ] **Set Supabase secrets for edge functions**
  ```bash
  # OpenAI API key (for workflow generation & annotation)
  npx supabase secrets set OPENAI_API_KEY="sk-..."

  # Verify secrets
  npx supabase secrets list
  ```

- [ ] **Deploy all edge functions**
  ```bash
  ./scripts/deploy-edge-functions.sh
  ```

- [ ] **Verify deployment**
  ```bash
  ./scripts/verify-deployment.sh
  ```

  Should show:
  - ✅ workflow-generate deployed
  - ✅ fnol-extract deployed
  - ✅ vision-annotate deployed
  - ✅ daily-optimize deployed

- [ ] **Test edge functions manually**
  ```bash
  # Test workflow generation
  curl -X POST \
    'https://your-project.supabase.co/functions/v1/workflow-generate' \
    -H 'Authorization: Bearer YOUR_ANON_KEY' \
    -H 'Content-Type: application/json' \
    -d '{"claim_type":"water_damage","description":"Burst pipe in basement"}'
  ```

---

## 🧪 Testing

### 5. Run All Tests

- [ ] **Unit tests (must pass with 80% coverage)**
  ```bash
  npm run test:coverage
  ```

  Expected output:
  ```
  Test Suites: 5 passed, 5 total
  Tests:       45 passed, 45 total
  Coverage:    82% (exceeds threshold of 80%)
  ```

- [ ] **Integration tests**
  ```bash
  npm run test:integration
  ```

- [ ] **E2E tests (iOS)**
  ```bash
  npm run detox:build:ios
  npm run detox:test:ios
  ```

- [ ] **E2E tests (Android)**
  ```bash
  npm run detox:build:android
  npm run detox:test:android
  ```

- [ ] **Manual testing checklist**
  - [ ] Login/logout flow
  - [ ] Create claim
  - [ ] Upload photo
  - [ ] Generate workflow
  - [ ] Export PDF
  - [ ] Settings sync
  - [ ] Offline mode
  - [ ] Photo compression

---

## 📱 Build & Deploy Mobile App

### 6. Configure Sentry

- [ ] **Install Sentry SDK** (if not already)
  ```bash
  npx @sentry/wizard -i reactNative
  ```

- [ ] **Add Sentry DSN to app.json**
  ```json
  {
    "expo": {
      "extra": {
        "sentryDsn": "YOUR_SENTRY_DSN"
      },
      "hooks": {
        "postPublish": [
          {
            "file": "sentry-expo/upload-sourcemaps",
            "config": {
              "organization": "your-org",
              "project": "claimsiq-mobile"
            }
          }
        ]
      }
    }
  }
  ```

- [ ] **Verify Sentry initialization**
  - Check `utils/errorTracking.ts` has `Sentry.init()`

### 7. Build with EAS

- [ ] **Review EAS configuration**
  ```bash
  cat eas.json
  ```

- [ ] **Build for iOS (production)**
  ```bash
  eas build --platform ios --profile production
  ```

  Wait for build to complete (15-30 minutes)

- [ ] **Build for Android (production)**
  ```bash
  eas build --platform android --profile production
  ```

  Wait for build to complete (15-30 minutes)

- [ ] **Download builds**
  ```bash
  # iOS
  eas build:download --platform ios --profile production

  # Android
  eas build:download --platform android --profile production
  ```

### 8. Submit to App Stores

- [ ] **iOS App Store**
  ```bash
  eas submit --platform ios --latest
  ```

  - [ ] Provide Apple credentials
  - [ ] Fill in app metadata
  - [ ] Upload screenshots
  - [ ] Submit for review

- [ ] **Google Play Store**
  ```bash
  eas submit --platform android --latest
  ```

  - [ ] Provide Google Play credentials
  - [ ] Fill in app metadata
  - [ ] Upload screenshots
  - [ ] Submit for review

---

## 🔐 Security & Compliance

### 9. Security Verification

- [ ] **Test RLS policies**
  ```sql
  -- Test as different user
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO 'user-id-1';

  SELECT * FROM claims; -- Should only see user's claims
  SELECT * FROM media;  -- Should only see user's media
  ```

- [ ] **Verify API keys are not in code**
  ```bash
  grep -r "sk-" --exclude-dir=node_modules .
  grep -r "supabase.co" --exclude-dir=node_modules .
  ```

- [ ] **Check storage bucket policies**
  - Go to Supabase → Storage → media → Policies
  - Verify authenticated-only access

- [ ] **Enable 2FA for admin accounts**
  - Supabase dashboard
  - Expo account
  - GitHub repository

### 10. GDPR Compliance

- [ ] **Privacy policy added to app**
- [ ] **Terms of service added to app**
- [ ] **Data export functionality tested** (`exportUserData`)
- [ ] **Data deletion process documented**

---

## 📊 Monitoring Setup

### 11. Configure Analytics

- [ ] **Verify analytics tracking**
  - Check `initAnalytics()` is called in App.tsx
  - Test a few events are being logged
  - Check Supabase `analytics_events` table has data

- [ ] **Setup Sentry performance monitoring**
  - Check transaction tracing is enabled
  - Verify performance data in Sentry dashboard

- [ ] **Create monitoring dashboards**
  - [ ] User activity dashboard
  - [ ] Error rate dashboard
  - [ ] Performance metrics
  - [ ] Feature usage stats

### 12. Alerting

- [ ] **Setup error alerts in Sentry**
  - Configure email notifications for critical errors
  - Setup Slack integration (optional)

- [ ] **Setup uptime monitoring**
  - Monitor edge functions availability
  - Monitor Supabase database

---

## 🚀 Go-Live

### 13. Pre-Launch Verification

- [ ] **Final smoke test on production build**
  - [ ] Install production IPA/APK
  - [ ] Test core user flows
  - [ ] Verify no console errors
  - [ ] Check Sentry for errors

- [ ] **Database backup**
  ```bash
  # Backup before going live
  npx supabase db dump > backup-$(date +%Y%m%d).sql
  ```

- [ ] **DNS/Domain verification** (if using custom domain)

### 14. Launch

- [ ] **Enable app in App Store**
- [ ] **Enable app in Google Play**
- [ ] **Announce to users** (email, Slack, etc.)

### 15. Post-Launch Monitoring (First 24 Hours)

- [ ] **Monitor error rates in Sentry**
  - Check every 2 hours for first 6 hours
  - Then every 6 hours for first day

- [ ] **Check analytics dashboard**
  - User signups
  - Feature usage
  - Session duration

- [ ] **Review app store reviews**
  - Respond to critical issues within 2 hours

- [ ] **Database performance**
  - Query performance
  - Connection pool usage

---

## 🔧 Rollback Plan

### If Critical Issues Arise

- [ ] **Rollback app version**
  ```bash
  # Revert to previous build
  eas build:rollback --platform ios --build-id PREVIOUS_BUILD_ID
  eas build:rollback --platform android --build-id PREVIOUS_BUILD_ID
  ```

- [ ] **Rollback database migrations**
  ```bash
  # Restore from backup
  psql -h db.your-project.supabase.co -U postgres -d postgres < backup-YYYYMMDD.sql
  ```

- [ ] **Rollback edge functions**
  ```bash
  # Redeploy previous version
  git checkout PREVIOUS_COMMIT
  ./scripts/deploy-edge-functions.sh
  ```

- [ ] **Communicate to users**
  - In-app message about temporary issues
  - Email notification if needed

---

## 📝 Post-Deployment

### 16. Documentation Updates

- [ ] **Update README.md** with new features
- [ ] **Document any manual configuration steps**
- [ ] **Update API documentation** (if applicable)
- [ ] **Create user guide** for new features

### 17. Team Handoff

- [ ] **Train support team** on new features
- [ ] **Create support runbook** for common issues
- [ ] **Setup on-call rotation** for critical issues

---

## ✅ Deployment Complete Checklist

Final verification that everything is working:

- [ ] ✅ App is live in App Store
- [ ] ✅ App is live in Google Play
- [ ] ✅ Edge functions are deployed and working
- [ ] ✅ Database migrations applied successfully
- [ ] ✅ RLS policies enforced
- [ ] ✅ Analytics tracking user events
- [ ] ✅ Sentry receiving error reports
- [ ] ✅ PDF export working
- [ ] ✅ Image compression working
- [ ] ✅ Settings syncing to Supabase
- [ ] ✅ Offline mode functional
- [ ] ✅ All tests passing
- [ ] ✅ Monitoring dashboards created
- [ ] ✅ Team trained and ready

---

## 🎉 Congratulations!

ClaimsIQ is now live in production. Monitor closely for the first 48 hours and be ready to respond to issues quickly.

### Important Contacts

- **Supabase Support**: https://supabase.com/support
- **Expo Support**: https://expo.dev/support
- **Sentry Support**: https://sentry.io/support

### Useful Commands Reference

```bash
# View logs
eas build:view --platform ios
supabase functions logs workflow-generate

# Check secrets
eas secret:list
supabase secrets list

# Database queries
npx supabase db diff
npx supabase db reset

# Builds
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform all

# Testing
npm test
npm run test:integration
npm run detox:test:ios
```

---

Generated: 2025-01-25
Version: 1.3.0
For: ClaimsIQ Adjuster Sidekick
