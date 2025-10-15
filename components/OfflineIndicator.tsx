// components/OfflineIndicator.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { isOnline, getNetworkState } from '@/services/offline';
import { syncNow, getSyncStats } from '@/services/sync';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function checkStatus() {
    const networkState = await getNetworkState();
    setOnline(!!networkState.isConnected);

    const stats = await getSyncStats();
    setPendingCount(stats.pendingOperations);
  }

  async function handleSync() {
    if (!online || syncing) return;

    setSyncing(true);
    try {
      await syncNow();
      await checkStatus();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  }

  if (online && pendingCount === 0) {
    return null; // Don't show when everything is fine
  }

  return (
    <View style={[styles.container, !online && styles.offline]}>
      <Text style={styles.text}>
        {!online ? '📴 Offline' : `⚠️ ${pendingCount} pending sync`}
      </Text>
      {online && pendingCount > 0 && (
        <Pressable onPress={handleSync} disabled={syncing}>
          <Text style={styles.syncButton}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offline: {
    backgroundColor: '#FEE2E2',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
  },
  syncButton: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

