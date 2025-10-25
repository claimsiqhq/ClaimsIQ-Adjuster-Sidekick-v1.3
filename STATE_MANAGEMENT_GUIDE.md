# State Management Guide - ClaimsIQ Adjuster Sidekick

This guide explains the new enterprise-grade state management system implemented with Zustand.

## Overview

The app now uses a comprehensive Zustand store (`useAppStore`) that manages all global state including:

- **Authentication** - Session, user, auth loading
- **Claims** - All claims, active claim, loading states
- **Media** - Photos, videos, selections, uploads
- **Documents** - PDFs, extraction status
- **Network & Sync** - Online status, sync queue, last sync time
- **UI** - Global loading, errors, notifications
- **Settings** - User preferences
- **Cache** - Cache timestamps for data freshness

## Quick Start

### 1. Basic Usage

```typescript
import { useAppStore, useClaims, useAuth } from '@/store/useAppStore';

function MyComponent() {
  // Option 1: Use selector hooks (recommended for performance)
  const { claims, addClaim } = useClaims();
  const { isAuthenticated, user } = useAuth();

  // Option 2: Use full store (only if you need multiple slices)
  const store = useAppStore();

  return (
    <View>
      <Text>Claims: {claims.length}</Text>
      <Text>User: {user?.email}</Text>
    </View>
  );
}
```

### 2. Integration Hooks

Use the integration hooks for common operations:

```typescript
import { useClaimsData } from '@/hooks/useClaimsData';
import { useMediaData } from '@/hooks/useMediaData';

function ClaimsScreen() {
  const {
    claims,
    claimsLoading,
    loadClaims,
    refreshClaims
  } = useClaimsData();

  return (
    <FlatList
      data={claims}
      onRefresh={refreshClaims}
      refreshing={claimsLoading}
      renderItem={({ item }) => <ClaimCard claim={item} />}
    />
  );
}
```

## Available Selector Hooks

### `useAuth()`
```typescript
const { session, user, isAuthenticated, authLoading, logout } = useAuth();
```

### `useClaims()`
```typescript
const {
  claims,
  activeClaim,
  claimsLoading,
  claimsError,
  setClaims,
  addClaim,
  updateClaim,
  removeClaim,
  setActiveClaim
} = useClaims();
```

### `useMediaState()`
```typescript
const {
  media,
  selectedMedia,
  mediaLoading,
  setMedia,
  toggleMediaSelection,
  clearMediaSelection
} = useMediaState();
```

### `useSync()`
```typescript
const {
  isOnline,
  syncStatus,
  pendingSyncOps,
  lastSyncTime,
  setSyncStatus
} = useSync();
```

### `useUI()`
```typescript
const {
  isLoading,
  errors,
  notifications,
  setLoading,
  addError,
  addNotification
} = useUI();
```

### `useSettings()`
```typescript
const { settings, updateSettings } = useSettings();
```

## Common Patterns

### 1. Loading Claims

```typescript
import { useClaims } from '@/store/useAppStore';
import { getClaims } from '@/services/claims';

function loadAllClaims() {
  const { setClaims, setClaimsLoading, setClaimsError } = useClaims();

  setClaimsLoading(true);
  setClaimsError(null);

  try {
    const claims = await getClaims(userId);
    setClaims(claims);
  } catch (error) {
    setClaimsError(error.message);
  } finally {
    setClaimsLoading(false);
  }
}
```

### 2. Adding a New Claim

```typescript
import { useClaims } from '@/store/useAppStore';

function createClaim(claimData) {
  const { addClaim } = useClaims();

  // Create in database
  const newClaim = await createClaimInDB(claimData);

  // Add to state
  addClaim(newClaim);
}
```

### 3. Updating Claims

```typescript
import { useClaims } from '@/store/useAppStore';

function handleClaimUpdate(claimId, updates) {
  const { updateClaim } = useClaims();

  // Update in database
  await updateClaimInDB(claimId, updates);

  // Update in state
  updateClaim(claimId, updates);
}
```

### 4. Managing Selection

```typescript
import { useMediaState } from '@/store/useAppStore';

function MediaGallery() {
  const { media, selectedMedia, toggleMediaSelection, clearMediaSelection } = useMediaState();

  return (
    <View>
      {media.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => toggleMediaSelection(item.id)}
          style={selectedMedia.includes(item.id) ? styles.selected : null}
        >
          <Image source={{ uri: item.storage_path }} />
        </Pressable>
      ))}

      {selectedMedia.length > 0 && (
        <Button title="Clear Selection" onPress={clearMediaSelection} />
      )}
    </View>
  );
}
```

### 5. Error Handling

```typescript
import { useUI } from '@/store/useAppStore';

function handleError(error: Error) {
  const { addError } = useUI();

  addError({
    id: Date.now().toString(),
    message: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context: {
      screen: 'ClaimsScreen',
      action: 'loadClaims'
    }
  });
}
```

### 6. Notifications

```typescript
import { useUI } from '@/store/useAppStore';

function showSuccessMessage() {
  const { addNotification } = useUI();

  addNotification('Claim created successfully!');

  // Auto-remove after 3 seconds
  setTimeout(() => {
    removeNotification(0);
  }, 3000);
}
```

### 7. Network Status

```typescript
import { useSync } from '@/store/useAppStore';
import NetInfo from '@react-native-community/netinfo';

function setupNetworkListener() {
  const { setOnlineStatus } = useSync();

  NetInfo.addEventListener((state) => {
    setOnlineStatus(state.isConnected ?? false);
  });
}
```

### 8. Cache Management

```typescript
import { useAppStore } from '@/store/useAppStore';

function loadClaimsWithCache() {
  const { setCacheTimestamp, isCacheStale } = useAppStore();

  const CACHE_KEY = 'claims';
  const MAX_AGE = 5 * 60 * 1000; // 5 minutes

  if (!isCacheStale(CACHE_KEY, MAX_AGE)) {
    console.log('Using cached claims');
    return;
  }

  // Fetch fresh data
  const claims = await getClaims();
  setClaims(claims);
  setCacheTimestamp(CACHE_KEY, Date.now());
}
```

## Migration from Old State

### Before (Component State)
```typescript
const [claims, setClaims] = useState([]);
const [loading, setLoading] = useState(false);
```

### After (Zustand Store)
```typescript
const { claims, claimsLoading, setClaims, setClaimsLoading } = useClaims();
```

## Performance Optimization

### 1. Use Selector Hooks

Instead of:
```typescript
const store = useAppStore();  // Re-renders on ANY state change
```

Use:
```typescript
const { claims } = useClaims();  // Only re-renders when claims change
```

### 2. Memoize Selectors

For complex computations:
```typescript
const filteredClaims = useMemo(() => {
  return claims.filter(c => c.status === 'open');
}, [claims]);
```

### 3. Avoid Unnecessary Re-renders

```typescript
// Bad: Component re-renders on any state change
function MyComponent() {
  const store = useAppStore();
  return <Text>{store.claims.length}</Text>;
}

// Good: Component only re-renders when claims change
function MyComponent() {
  const claimsCount = useAppStore(state => state.claims.length);
  return <Text>{claimsCount}</Text>;
}
```

## Persistence

The store automatically persists these fields to AsyncStorage:
- `settings` - User preferences
- `cacheTimestamps` - Cache metadata
- `lastSyncTime` - Last sync timestamp

Sensitive data (session, user) is NOT persisted for security.

## Testing

### Mock the Store

```typescript
import { useAppStore } from '@/store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    claims: mockClaims,
    isAuthenticated: true,
  });
});

afterEach(() => {
  useAppStore.getState().reset();
});
```

## Best Practices

1. **Use integration hooks** (`useClaimsData`, `useMediaData`) instead of directly calling services
2. **Use selector hooks** (`useClaims`, `useAuth`) instead of full store access
3. **Handle errors globally** using the `useUI().addError()` function
4. **Update state optimistically** before API calls for better UX
5. **Clear sensitive data** on logout using `logout()` action
6. **Use cache timestamps** to avoid unnecessary API calls
7. **Monitor sync status** in offline scenarios

## Next Steps

1. Replace all `useState` with store actions in screens
2. Migrate auth logic to use `useAuth` hook
3. Connect network listener to `setOnlineStatus`
4. Implement global error boundary using `useUI().errors`
5. Add offline sync using `pendingSyncOps`

## Troubleshooting

### State not persisting
- Check AsyncStorage permissions
- Verify partialize configuration

### State not updating
- Ensure you're using `set()` function correctly
- Check if you're mutating state directly (use spread operator)

### Performance issues
- Use selector hooks instead of full store
- Memoize expensive computations
- Check for unnecessary re-renders with React DevTools

## Support

For issues or questions about state management, refer to:
- Zustand docs: https://github.com/pmndrs/zustand
- AsyncStorage docs: https://react-native-async-storage.github.io/async-storage/
