import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import Section from "@/components/Section";
import { colors } from "@/theme/colors";
import { supabase } from "@/utils/supabase";
import { getSession } from "@/services/auth";

interface DashboardStats {
  totalClaims: number;
  photosToday: number;
  photosTotal: number;
  claimsInProgress: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalClaims: 0,
    photosToday: 0,
    photosTotal: 0,
    claimsInProgress: 0,
  });
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

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

  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
      <Header 
        title={`${greeting()}, ${userName}`}
        subtitle="Your Claims iQ Sidekick dashboard"
      />

      <Section title="Today's Overview">
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <Text style={styles.statValue}>{stats.totalClaims}</Text>
            <Text style={styles.statLabel}>Total Claims</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <Text style={styles.statValue}>{stats.photosToday}</Text>
            <Text style={styles.statLabel}>Photos Today</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontSize: 20 }]}>{stats.claimsInProgress}</Text>
            <Text style={[styles.statLabel, { fontSize: 10 }]}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontSize: 20 }]}>{stats.photosTotal}</Text>
            <Text style={[styles.statLabel, { fontSize: 10 }]}>Total Photos</Text>
          </View>
        </View>
      </Section>

      <Section title="Quick Actions">
        <Pressable 
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/capture')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>📷</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Capture Photos</Text>
            <Text style={styles.actionDesc}>Take photos and start AI analysis</Text>
          </View>
        </Pressable>

        <Pressable 
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/claims')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>📁</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View Claims</Text>
            <Text style={styles.actionDesc}>Browse and manage your claims</Text>
          </View>
        </Pressable>

        <Pressable 
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/today')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>📅</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Today's Schedule</Text>
            <Text style={styles.actionDesc}>View active claims and watchlist</Text>
          </View>
        </Pressable>
      </Section>

      <Section title="About Claims iQ Sidekick">
        <Text style={styles.aboutText}>
          Your intelligent assistant for streamlining claims processing and management. 
          Capture photos, leverage AI-powered damage detection, and manage claims efficiently.
        </Text>
      </Section>
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
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardLarge: {
    minHeight: 100,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5F6771',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
    borderColor: colors.light,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    color: '#5F6771',
  },
  aboutText: {
    fontSize: 14,
    color: '#2B2F36',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
