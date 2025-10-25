# Sentry Error Tracking Setup Guide

This guide walks you through setting up Sentry for production error tracking and monitoring.

## Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up for a free account (50k events/month free)
3. Create a new project:
   - Platform: **React Native**
   - Project name: **ClaimsIQ Adjuster Sidekick**
   - Team: Your organization

## Step 2: Get Your DSN

After creating the project:

1. You'll see a DSN (Data Source Name) that looks like:
   ```
   https://[key]@[organization].ingest.sentry.io/[project-id]
   ```

2. Copy this DSN - you'll need it for configuration

## Step 3: Add DSN to Environment

### For Development (Replit)

1. Add to Replit Secrets:
   - Key: `EXPO_PUBLIC_SENTRY_DSN`
   - Value: Your DSN from Step 2

2. Add to Replit Secrets:
   - Key: `EXPO_PUBLIC_ENV`
   - Value: `development` or `production`

### For EAS Builds

```bash
# Set Sentry DSN as EAS secret
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your-dsn-here"

# Set environment
eas secret:create --scope project --name EXPO_PUBLIC_ENV --value "production"
```

### Local .env File

Add to `.env`:
```
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn-here
EXPO_PUBLIC_ENV=development
```

## Step 4: Install Sentry SDK

```bash
npm install @sentry/react-native
```

## Step 5: Initialize Sentry

The app is already configured to initialize Sentry in `app/_layout.tsx`. Just ensure it's called:

```typescript
import errorTracking from '@/utils/errorTracking';

// In your root component
useEffect(() => {
  errorTracking.init();
  errorTracking.interceptConsoleErrors();
}, []);
```

## Step 6: Configure Source Maps (Optional but Recommended)

For better stack traces in production:

1. Add to `app.json`:
```json
{
  "expo": {
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "your-org",
            "project": "claimsiq-adjuster-sidekick",
            "authToken": "your-auth-token"
          }
        }
      ]
    }
  }
}
```

2. Get auth token from: https://sentry.io/settings/account/api/auth-tokens/

## Step 7: Test Error Tracking

### Manual Test

Add this button to any screen:

```typescript
import { captureError } from '@/utils/errorTracking';

<Pressable onPress={() => {
  captureError(new Error('Test error from ClaimsIQ'), {
    screen: 'TestScreen',
    action: 'manual_test'
  });
}}>
  <Text>Send Test Error</Text>
</Pressable>
```

### Automatic Test

Errors are automatically captured when:
- React components crash (via ErrorBoundary)
- console.error is called
- Unhandled promise rejections occur
- Native crashes happen

## Step 8: Verify in Sentry Dashboard

1. Go to https://sentry.io/organizations/your-org/issues/
2. You should see your test error appear within seconds
3. Click on it to see:
   - Stack trace
   - Breadcrumbs (user actions leading to error)
   - Device info
   - User context
   - Tags and context

## Usage Examples

### Basic Error Capture

```typescript
import { captureError } from '@/utils/errorTracking';

try {
  await somethingRisky();
} catch (error) {
  captureError(error as Error, {
    screen: 'ClaimsScreen',
    action: 'loadClaims',
    claimId: '123'
  });
}
```

### Network Errors

```typescript
import { captureNetworkError } from '@/utils/errorTracking';

try {
  const response = await fetch(url);
} catch (error) {
  captureNetworkError(error as Error, url, 'GET');
}
```

### Database Errors

```typescript
import { captureDatabaseError } from '@/utils/errorTracking';

try {
  await supabase.from('claims').insert(data);
} catch (error) {
  captureDatabaseError(error as Error, 'claims', 'insert');
}
```

### Edge Function Errors

```typescript
import { captureEdgeFunctionError } from '@/utils/errorTracking';

try {
  const { data, error } = await supabase.functions.invoke('workflow-generate', {
    body: { claimId }
  });
  if (error) throw error;
} catch (error) {
  captureEdgeFunctionError(error as Error, 'workflow-generate', { claimId });
}
```

### Set User Context

```typescript
import { setUser } from '@/utils/errorTracking';

// After login
const session = await signIn(email, password);
setUser(session.user.id, session.user.email);

// After logout
setUser(null);
```

### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/utils/errorTracking';

addBreadcrumb('User tapped Generate Workflow button', 'user_action', {
  claimId: '123',
  screen: 'ClaimDetail'
});
```

### Track Navigation

```typescript
import { trackScreen } from '@/utils/errorTracking';

useEffect(() => {
  trackScreen('ClaimDetailScreen');
}, []);
```

## Performance Monitoring

Sentry also tracks performance automatically:

### Transaction Tracking

```typescript
import { measurePerformance } from '@/utils/errorTracking';

const claims = await measurePerformance('loadClaims', async () => {
  return await getClaims(userId);
});
```

### View Performance Dashboard

1. Go to Sentry dashboard
2. Click "Performance" tab
3. See:
   - Average load times
   - Slow database queries
   - API response times
   - Screen load times

## Alerts & Notifications

### Set Up Alerts

1. Go to Sentry → Settings → Alerts
2. Create alert rules:
   - Email on new issue
   - Slack notification for critical errors
   - PagerDuty for production outages

### Example Alert Rules

- **High Error Rate**: Alert if error rate > 10/minute
- **New Error**: Alert on first occurrence of new error
- **Regression**: Alert when fixed error reappears
- **Performance**: Alert if transaction > 5 seconds

## Best Practices

1. **Set User Context** - Always set user ID after login
2. **Add Breadcrumbs** - Track user actions for debugging
3. **Use Error Context** - Include screen, action, IDs in errors
4. **Monitor Performance** - Track slow operations
5. **Review Weekly** - Check Sentry dashboard regularly
6. **Fix High-Frequency Errors** - Prioritize errors affecting many users
7. **Use Tags** - Tag errors by feature, platform, version

## Troubleshooting

### Errors Not Appearing

- Check EXPO_PUBLIC_SENTRY_DSN is set
- Verify environment is not 'development' (Sentry disabled in dev by default)
- Check network connectivity
- Look for console warnings about Sentry init

### Too Many Errors

- Adjust sample rate in `errorTracking.ts`:
  ```typescript
  tracesSampleRate: 0.1  // Sample 10% of events
  ```
- Add filters in Sentry dashboard to ignore known issues

### Missing Stack Traces

- Upload source maps (see Step 6)
- Ensure error is captured with stack trace:
  ```typescript
  const error = new Error('message');
  captureError(error);  // Has stack
  ```

## Cost Management

Sentry free tier:
- **50,000 events/month** free
- **1 member** included
- **30 days** data retention

If you exceed limits:
- **Team plan**: $26/month (100k events)
- **Business plan**: $80/month (500k events)

## Support

- Sentry docs: https://docs.sentry.io/platforms/react-native/
- Sentry support: support@sentry.io
- ClaimsIQ docs: See `/docs/error-tracking.md`
