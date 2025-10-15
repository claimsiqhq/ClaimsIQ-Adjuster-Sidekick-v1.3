// components/SyncStatus.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/colors';
import { syncNow, getSyncStats, SyncResult } from '@/services/sync';
import { isOnline } from '@/services/offline';

export function SyncStatus() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ pendingOperations: 0, hasUnsyncedChanges: false });
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    setOnline(isOnline());
    const syncStats = await getSyncStats();
    setStats(syncStats);
  }

  async function handleSync() {
    if (!online || syncing) return;

    setSyncing(true);
    try {
      const result = await syncNow();
      setLastResult(result);
      await loadStats();
    } catch (error: any) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.statusDot, online ? styles.online : styles.offline]} />
        <Text style={styles.statusText}>
          {online ? 'Online' : 'Offline'}
        </Text>
      </View>

      {stats.pendingOperations > 0 && (
        <Text style={styles.pendingText}>
          {stats.pendingOperations} pending change{stats.pendingOperations > 1 ? 's' : ''}
        </Text>
      )}

      {lastResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>
            Last sync: ↑{lastResult.pushed} pushed, ↓{lastResult.pulled} pulled
          </Text>
          {lastResult.errors.length > 0 && (
            <Text style={styles.errorText}>
              {lastResult.errors.length} error{lastResult.errors.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      <Pressable
        style={[styles.button, (!online || syncing) && styles.buttonDisabled]}
        onPress={handleSync}
        disabled={!online || syncing}
      >
        {syncing ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {stats.pendingOperations > 0 ? `Sync ${stats.pendingOperations} Changes` : 'Sync Now'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#10B981',
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
  },
  pendingText: {
    fontSize: 13,
    color: '#F59E0B',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 12,
    color: '#4B5563',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

