import { useEffect, useState } from 'react';
import { Stack, SplashScreen, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { onAuthStateChange } from '@/services/auth';
import { View, ActivityIndicator } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setAuthed(!!data.session);
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthed(false); // Default to not authenticated on error
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
    
    const unsub = onAuthStateChange(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setAuthed(!!data.session);
      } catch (error) {
        console.error('Auth state change error:', error);
      }
    });
    return unsub;
  }, []);

  if (!ready || authed === null) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!authed) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Redirect href="/auth/login" />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="photo" options={{ headerShown: false }} />
          <Stack.Screen name="claim" options={{ headerShown: false }} />
          <Stack.Screen name="document" options={{ headerShown: false }} />
          <Stack.Screen name="report" options={{ headerShown: false }} />
          <Stack.Screen name="lidar" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
