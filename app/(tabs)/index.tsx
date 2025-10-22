// app/(tabs)/index.tsx
// Home screen with dashboard, weather, and quick actions

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { getSession } from '@/services/auth';
import { getCurrentLocation, getWeather, type Weather } from '@/services/weather';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';

interface Stats {
  totalClaims: number;
  photosToday: number;
  photosTotal: number;
  claimsInProgress: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalClaims: 0,
    photosToday: 0,
    photosTotal: 0,
    claimsInProgress: 0,
  });
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [units, setUnits] = useState<'metric' | 'imperial'>('imperial');

  useEffect(() => {
    loadDashboard();
    loadUnitsPreference();
  }, []);

  async function loadUnitsPreference() {
    const stored = await AsyncStorage.getItem('settings_units');
    if (stored === 'metric' || stored === 'imperial') {
      setUnits(stored);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      
      // Get user session
      const session = await getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', session.user.id)
          .single();
        
        setUserName(profile?.display_name || profile?.email?.split('@')[0] || 'User');
      }
      
      // Get claims count
      const { count: claimsCount } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true });
      
      // Get in-progress claims count
      const { count: inProgressCount } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');
      
      // Get total photos count
      const { count: photosCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true });
      
      // Get photos from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: photosTodayCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      setStats({
        totalClaims: claimsCount || 0,
        photosToday: photosTodayCount || 0,
        photosTotal: photosCount || 0,
        claimsInProgress: inProgressCount || 0,
      });

      // Load current weather
      try {
        const location = await getCurrentLocation();
        const currentWeather = await getWeather(location.latitude, location.longitude);
        setWeather(currentWeather);
      } catch (error) {
        console.log('Weather unavailable:', error);
        setWeather(null);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTemperature = (temp: number) => {
    return units === 'imperial' ? `${Math.round(temp)}°F` : `${Math.round(temp)}°C`;
  };

  const formatWindSpeed = (speed: number) => {
    return units === 'imperial' ? `${Math.round(speed)} mph` : `${Math.round(speed)} km/h`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
        <Header 
          title={`${greeting()}, ${userName}`}
          subtitle="Your Claims Dashboard"
        />

        {/* Weather Card - Top Priority */}
        {weather && (
          <View style={styles.weatherSection}>
            <View style={styles.weatherMainCard}>
              <View style={styles.weatherHeader}>
                <Text style={styles.weatherLocation}>{weather.location || 'Current Location'}</Text>
                <Text style={styles.weatherTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={styles.weatherBody}>
                <View style={styles.weatherLeft}>
                  <Text style={styles.weatherTemp}>{formatTemperature(weather.temperature)}</Text>
                  <Text style={styles.weatherFeels}>Feels like {formatTemperature(weather.feelsLike)}</Text>
                </View>
                <View style={styles.weatherRight}>
                  <Text style={styles.weatherCondition}>{weather.condition}</Text>
                  <Text style={styles.weatherDetail}>Wind: {formatWindSpeed(weather.windSpeed)}</Text>
                  <Text style={styles.weatherDetail}>Humidity: {weather.humidity}%</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions - Horizontal Scroll */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
            <Pressable 
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/capture')}
            >
              <View style={styles.quickActionIconBg}>
                <Text style={styles.quickActionIcon}>📷</Text>
              </View>
              <Text style={styles.quickActionTitle}>Capture</Text>
              <Text style={styles.quickActionDesc}>Take photos</Text>
            </Pressable>

            <Pressable 
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/claims')}
            >
              <View style={styles.quickActionIconBg}>
                <Text style={styles.quickActionIcon}>📋</Text>
              </View>
              <Text style={styles.quickActionTitle}>Claims</Text>
              <Text style={styles.quickActionDesc}>View all</Text>
            </Pressable>

            <Pressable 
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/today')}
            >
              <View style={styles.quickActionIconBg}>
                <Text style={styles.quickActionIcon}>📅</Text>
              </View>
              <Text style={styles.quickActionTitle}>Schedule</Text>
              <Text style={styles.quickActionDesc}>Today's plan</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Stats Overview - Modern Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Activity Overview</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.statNumber}>{stats.claimsInProgress}</Text>
              <Text style={styles.statLabelWhite}>Active Claims</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.purple }]}>
              <Text style={styles.statNumber}>{stats.photosToday}</Text>
              <Text style={styles.statLabelWhite}>Photos Today</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxOutline]}>
              <Text style={[styles.statNumber, { color: colors.core }]}>{stats.totalClaims}</Text>
              <Text style={styles.statLabelDark}>Total Claims</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxOutline]}>
              <Text style={[styles.statNumber, { color: colors.core }]}>{stats.photosTotal}</Text>
              <Text style={styles.statLabelDark}>Total Photos</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <Section title="Recent Activity">
          <View style={styles.activityCard}>
            <View style={styles.activityDot} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Ready for inspections</Text>
              <Text style={styles.activityTime}>Start by capturing photos or uploading FNOL documents</Text>
            </View>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.bgSoft 
  },
  container: { 
    flex: 1 
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  
  // Weather Styles
  weatherSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  weatherMainCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weatherLocation: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.core,
  },
  weatherTime: {
    fontSize: 14,
    color: colors.textSoft,
  },
  weatherBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherLeft: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  weatherFeels: {
    fontSize: 14,
    color: colors.textSoft,
  },
  weatherRight: {
    flex: 1,
    justifyContent: 'center',
  },
  weatherCondition: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 8,
  },
  weatherDetail: {
    fontSize: 14,
    color: colors.textSoft,
    marginBottom: 4,
  },

  // Quick Actions
  quickActionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  quickActions: {
    paddingHorizontal: 12,
  },
  quickActionCard: {
    width: 100,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: 11,
    color: colors.textSoft,
  },

  // Stats
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  statBoxOutline: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  statLabelWhite: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '500',
  },
  statLabelDark: {
    fontSize: 13,
    color: colors.textSoft,
    fontWeight: '500',
  },

  // Activity
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSoft,
  },
});