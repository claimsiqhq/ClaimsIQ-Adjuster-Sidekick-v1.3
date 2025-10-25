// Simplified Home Screen - Much cleaner and more focused
// Replace index.tsx with this file

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { textStyles } from '@/theme/typography';
import { getCurrentLocation } from '@/services/location';
import { getWeather, isSafeForRoofInspection } from '@/services/weather';
import { getClaimsWithSLA } from '@/services/optimize';
import { useClaimsData } from '@/hooks/useClaimsData';

export default function HomeScreen() {
  const router = useRouter();
  const { claims } = useClaimsData();
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [claimsWithSLA, setClaimsWithSLA] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // Load weather and claims in parallel
      const [weatherData, slaClaimsData] = await Promise.all([
        loadWeather(),
        getClaimsWithSLA(),
      ]);

      setWeather(weatherData);
      setClaimsWithSLA(slaClaimsData);
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }

  async function loadWeather() {
    try {
      const location = await getCurrentLocation();
      const weatherData = await getWeather(location.latitude, location.longitude);
      return weatherData;
    } catch (error) {
      return null;
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  // Calculate stats
  const stats = {
    total: claimsWithSLA.length,
    overdue: claimsWithSLA.filter(c => c.sla_status === 'overdue').length,
    dueToday: claimsWithSLA.filter(c => c.sla_status === 'critical').length,
  };

  const urgentClaims = claimsWithSLA
    .filter(c => c.sla_status === 'overdue' || c.sla_status === 'critical')
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Header
          title="Dashboard"
          subtitle={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            value={stats.overdue}
            label="Overdue"
            icon="alert-circle"
            color={colors.error}
            onPress={() => router.push('/(tabs)/claims')}
          />
          <StatCard
            value={stats.dueToday}
            label="Due Today"
            icon="time"
            color={colors.warning}
            onPress={() => router.push('/(tabs)/claims')}
          />
          <StatCard
            value={stats.total}
            label="Active"
            icon="folder-open"
            color={colors.primary}
            onPress={() => router.push('/(tabs)/claims')}
          />
        </View>

        {/* Weather Card */}
        {weather && (
          <Card style={styles.card}>
            <View style={styles.weatherHeader}>
              <View>
                <Text style={styles.weatherTemp}>
                  {Math.round(weather.temperature)}°
                </Text>
                <Text style={styles.weatherCondition}>{weather.condition}</Text>
              </View>
              <Text style={styles.weatherIcon}>
                {weather.partOfDay === 'day' ? '☀️' : '🌙'}
              </Text>
            </View>

            {isSafeForRoofInspection(weather).safe ? (
              <View style={styles.safetyBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.safetyText}>Safe for outdoor inspections</Text>
              </View>
            ) : (
              <View style={[styles.safetyBadge, styles.safetyBadgeWarning]}>
                <Ionicons name="warning" size={16} color={colors.error} />
                <Text style={[styles.safetyText, { color: colors.error }]}>
                  {isSafeForRoofInspection(weather).reason}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Urgent Claims */}
        {urgentClaims.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Urgent Claims</Text>
              <Pressable onPress={() => router.push('/(tabs)/claims')}>
                <Text style={styles.seeAllLink}>See All</Text>
              </Pressable>
            </View>

            {urgentClaims.map((claim) => (
              <Card
                key={claim.id}
                onPress={() => router.push(`/claim/${claim.id}`)}
                style={styles.claimCard}
              >
                <View style={styles.claimHeader}>
                  <Text style={styles.claimNumber}>#{claim.claim_number}</Text>
                  <View
                    style={[
                      styles.slaBadge,
                      claim.sla_status === 'overdue'
                        ? styles.slaBadgeOverdue
                        : styles.slaBadgeCritical,
                    ]}
                  >
                    <Text style={styles.slaText}>
                      {claim.sla_status === 'overdue'
                        ? 'OVERDUE'
                        : `${Math.round(claim.hours_remaining)}h left`}
                    </Text>
                  </View>
                </View>

                <Text style={styles.claimLocation} numberOfLines={1}>
                  {claim.loss_location || 'No location'}
                </Text>

                <View style={styles.claimFooter}>
                  <Text style={styles.claimType}>{claim.loss_type || 'Unknown'}</Text>
                  <Text style={styles.claimProgress}>
                    {claim.progress_percent}% complete
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <Button
            title="Capture Photo"
            icon="camera"
            onPress={() => router.push('/(tabs)/capture')}
            variant="primary"
            fullWidth
            style={styles.actionButton}
          />

          <Button
            title="Upload Document"
            icon="document"
            onPress={() => router.push('/document/upload')}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />

          <Button
            title="View Map & Route"
            icon="map"
            onPress={() => router.push('/(tabs)/map')}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />
        </View>

        {/* Empty State */}
        {claims.length === 0 && (
          <EmptyState
            icon="folder-open-outline"
            title="No Active Claims"
            message="Upload an FNOL document or create a new claim to get started"
            actionLabel="Upload FNOL"
            onAction={() => router.push('/document/upload')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Stat Card Component
function StatCard({
  value,
  label,
  icon,
  color,
  onPress,
}: {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    ...textStyles.stat,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...textStyles.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  weatherTemp: {
    ...textStyles.display,
    color: colors.primary,
  },
  weatherCondition: {
    ...textStyles.body,
    marginTop: spacing.xs,
  },
  weatherIcon: {
    fontSize: 48,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
  },
  safetyBadgeWarning: {
    backgroundColor: colors.errorBg,
  },
  safetyText: {
    ...textStyles.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...textStyles.h3,
  },
  seeAllLink: {
    ...textStyles.link,
    textDecorationLine: 'none',
  },
  claimCard: {
    marginBottom: spacing.md,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  claimNumber: {
    ...textStyles.h4,
  },
  slaBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  slaBadgeOverdue: {
    backgroundColor: colors.error,
  },
  slaBadgeCritical: {
    backgroundColor: colors.warning,
  },
  slaText: {
    ...textStyles.caption,
    color: colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  claimLocation: {
    ...textStyles.body,
    marginBottom: spacing.sm,
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimType: {
    ...textStyles.bodySmall,
    textTransform: 'capitalize',
  },
  claimProgress: {
    ...textStyles.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  actionButton: {
    marginBottom: spacing.md,
  },
});
