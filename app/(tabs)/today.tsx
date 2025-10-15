import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import Header from "@/components/Header";
import Section from "@/components/Section";
import { colors } from "@/theme/colors";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";

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

  useEffect(() => {
    loadTodayData();
  }, []);

  async function loadTodayData() {
    try {
      setLoading(true);
      
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

      <Section title="Weather & Route">
        <Text style={styles.p}>
          Weather integration coming soon. Check your local forecast before heading out to inspect properties.
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
});
