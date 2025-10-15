import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import Header from "@/components/Header";
import Section from "@/components/Section";
import { colors } from "@/theme/colors";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { getCurrentLocation } from "@/services/location";
import { getWeather, getWeatherAlerts, isSafeForRoofInspection, Weather, WeatherAlert } from "@/services/weather";

interface ClaimSummary {
  id: string;
  claim_number: string | null;
  status: string | null;
  created_at: string;
}

export default function TodayScreen() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, dueToday: 0 });
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);

  useEffect(() => {
    loadTodayData();
  }, []);

  async function loadTodayData() {
    try {
      setLoading(true);
      
      // Load weather for current location
      try {
        const location = await getCurrentLocation();
        const currentWeather = await getWeather(location.latitude, location.longitude);
        const alerts = await getWeatherAlerts(location.latitude, location.longitude);
        setWeather(currentWeather);
        setWeatherAlerts(alerts);
      } catch (error) {
        console.log('Weather fetch failed:', error);
      }
      
      // Load all claims
      const { data: allClaims, error } = await supabase
        .from('claims')
        .select('id, claim_number, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const claimsList = allClaims || [];
      setClaims(claimsList);
      
      // Calculate stats
      const inProgress = claimsList.filter(c => c.status === 'in_progress').length;
      
      // For "due today", check claims created in last 7 days without 'completed' status
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dueToday = claimsList.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= sevenDaysAgo && c.status !== 'completed' && c.status !== 'closed';
      }).length;
      
      setStats({
        total: claimsList.length,
        inProgress,
        dueToday,
      });
    } catch (error) {
      console.error('Error loading today data:', error);
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

  // Get in-progress and recent claims for watchlist
  const watchlistClaims = claims
    .filter(c => c.status === 'in_progress' || c.status === 'open')
    .slice(0, 5);

  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Header title="Today" subtitle="Your daily overview and priority claims." />
      
      <Section title="Quick Stats">
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Claims</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.dueToday}</Text>
            <Text style={styles.statLabel}>Need Attention</Text>
          </View>
        </View>
      </Section>

      <Section title="Active Claims Watchlist">
        {watchlistClaims.length === 0 ? (
          <Text style={styles.emptyText}>No active claims. Great work!</Text>
        ) : (
          watchlistClaims.map((claim) => (
            <Pressable
              key={claim.id}
              style={styles.claimCard}
              onPress={() => router.push(`/claim/${claim.id}`)}
            >
              <View style={styles.claimInfo}>
                <Text style={styles.claimNumber}>
                  Claim #{claim.claim_number || 'Unnamed'}
                </Text>
                <Text style={styles.claimStatus}>
                  Status: {claim.status || 'open'}
                </Text>
                <Text style={styles.claimDate}>
                  Created: {new Date(claim.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>View</Text>
              </View>
            </Pressable>
          ))
        )}
      </Section>

      <Section title="Quick Actions">
        <Pressable 
          style={styles.cta} 
          onPress={() => router.push('/(tabs)/capture')}
        >
          <Text style={styles.ctaText}>📷 Capture New Photos</Text>
        </Pressable>
        <Pressable 
          style={[styles.cta, { backgroundColor: colors.gold }]} 
          onPress={() => router.push('/(tabs)/claims')}
        >
          <Text style={[styles.ctaText, { color: colors.core }]}>📁 View All Claims</Text>
        </Pressable>
      </Section>

      {weather && (
        <Section title="Weather Conditions">
          <View style={styles.weatherCard}>
            <View style={styles.weatherMain}>
              <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°F</Text>
              <Text style={styles.weatherCondition}>{weather.condition}</Text>
              <Text style={styles.weatherWind}>Wind: {Math.round(weather.windSpeed)} mph</Text>
            </View>
            
            {isSafeForRoofInspection(weather).safe ? (
              <View style={styles.safetyBadge}>
                <Text style={styles.safetyText}>✓ Safe for roof work</Text>
              </View>
            ) : (
              <View style={[styles.safetyBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.safetyText, { color: '#DC2626' }]}>
                  ⚠️ {isSafeForRoofInspection(weather).reason}
                </Text>
              </View>
            )}
          </View>

          {weatherAlerts.length > 0 && (
            <View style={styles.alertsContainer}>
              {weatherAlerts.map((alert, index) => (
                <View key={index} style={[styles.alertCard, getSeverityColor(alert.severity)]}>
                  <Text style={styles.alertHeadline}>{alert.headline}</Text>
                  <Text style={styles.alertDesc} numberOfLines={2}>{alert.description}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#5F6771',
    textAlign: 'center',
  },
  claimCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  claimInfo: {
    flex: 1,
  },
  claimNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  claimStatus: {
    fontSize: 12,
    color: '#5F6771',
    textTransform: 'capitalize',
  },
  claimDate: {
    fontSize: 11,
    color: '#9AA0A6',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  p: { color: "#2B2F36", marginBottom: 8, paddingHorizontal: 16 },
  cta: { 
    backgroundColor: colors.primary, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: "center", 
    marginHorizontal: 16,
    marginBottom: 8,
  },
  ctaText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  weatherCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  weatherMain: {
    marginBottom: 12,
  },
  weatherTemp: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
  },
  weatherCondition: {
    fontSize: 16,
    color: colors.core,
    marginTop: 4,
  },
  weatherWind: {
    fontSize: 13,
    color: '#5F6771',
    marginTop: 4,
  },
  safetyBadge: {
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
  },
  safetyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  alertsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  alertCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  alertHeadline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 12,
    color: '#92400E',
  },
});

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'extreme': return { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' };
    case 'severe': return { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' };
    default: return { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' };
  }
}
