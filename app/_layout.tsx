import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { View, ActivityIndicator } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
    }).catch(() => {
      setAuthed(false);
    });
  }, []);

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
