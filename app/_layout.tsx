import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase is configured
    try {
      const { supabase } = require('@/utils/supabase');
      
      supabase.auth.getSession().then(({ data }) => {
        setAuthed(!!data.session);
      }).catch((error: any) => {
        console.error('Auth session error:', error);
        setAuthed(false);
      });
    } catch (error: any) {
      console.error('Supabase initialization error:', error);
      setConnectionError(error.message || 'Failed to connect to Supabase');
      setAuthed(false);
    }
  }, []);

  if (connectionError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorText}>{connectionError}</Text>
        <Text style={styles.errorHint}>
          Please ensure environment variables are properly configured in your build.
        </Text>
      </View>
    );
  }

  if (authed === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3F7' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          {!authed ? (
            <Stack.Screen name="auth/login" />
          ) : (
            <>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="admin" />
              <Stack.Screen name="photo" />
              <Stack.Screen name="claim" />
              <Stack.Screen name="document" />
              <Stack.Screen name="report" />
              <Stack.Screen name="lidar" />
            </>
          )}
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3F7',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#5F6771',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
