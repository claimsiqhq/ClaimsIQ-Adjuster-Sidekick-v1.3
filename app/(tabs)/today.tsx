// app/(tabs)/today.tsx
// AI-Powered Daily Overview Dashboard

import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Pressable, 
  RefreshControl,
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';
import { getCurrentLocation } from '@/services/location';
import { getWeather, Weather, WeatherAlert, getWeatherAlerts, isSafeForRoofInspection } from '@/services/weather';
import { 
  generateDailyOptimization, 
  getDailyOptimization, 
  getClaimsWithSLA,
  DailyOptimization 
} from '@/services/optimize';

const { width: screenWidth } = Dimensions.get('window');
const WEATHER_API_CONFIGURED = !!process.env.EXPO_PUBLIC_WEATHER_API_KEY;

export default function TodayScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [claimsWithSLA, setClaimsWithSLA] = useState<any[]>([]);
  const [optimization, setOptimization] = useState<DailyOptimization | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      // Load all data in parallel
      const [weatherData, claims, dailyOpt] = await Promise.all([
        loadWeatherData(),
        getClaimsWithSLA(),
        getDailyOptimization()
      ]);

      setClaimsWithSLA(claims);
      setOptimization(dailyOpt);

      // If no optimization exists and there are claims, generate one
      if (!dailyOpt && claims.length > 0) {
        await generateOptimization();
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeatherData() {
    if (!WEATHER_API_CONFIGURED) {
      setWeatherError('Add EXPO_PUBLIC_WEATHER_API_KEY to enable weather insights.');
      return null;
    }

    try {
      const location = await getCurrentLocation();
      const currentWeather = await getWeather(location.latitude, location.longitude);
      const alerts = await getWeatherAlerts(location.latitude, location.longitude);

      setWeather(currentWeather);
      setWeatherAlerts(alerts);
      setWeatherError(null);

      return currentWeather;
    } catch (error) {
      console.log('Weather fetch failed:', error);
      setWeatherError('Unable to fetch weather for your location.');
      return null;
    }
  }

  async function generateOptimization() {
    setGeneratingAI(true);
    try {
      const newOpt = await generateDailyOptimization();
      if (newOpt) {
        setOptimization(newOpt);
      }
    } catch (error) {
      console.error('Failed to generate optimization:', error);
    } finally {
      setGeneratingAI(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  function getSLAColor(status: string) {
    switch (status) {
      case 'overdue': return colors.error;
      case 'critical': return '#FF6B6B';
      case 'warning': return colors.warning;
      default: return colors.success;
    }
  }

  function getProgressRingColor(percent: number) {
    if (percent < 33) return '#FF6B6B';
    if (percent < 66) return colors.warning;
    return colors.success;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your daily overview...</Text>
      </View>
    );
  }

  const stats = {
    total: claimsWithSLA.length,
    overdue: claimsWithSLA.filter(c => c.sla_status === 'overdue').length,
    today: claimsWithSLA.filter(c => c.sla_status === 'critical' || c.sla_status === 'warning').length,
    avgProgress: claimsWithSLA.length > 0 
      ? Math.round(claimsWithSLA.reduce((acc, c) => acc + c.progress_percent, 0) / claimsWithSLA.length)
      : 0
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header 
        title="Daily Overview" 
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} 
      />

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, stats.overdue > 0 && styles.statCardDanger]}>
          <Text style={styles.statValue}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.today}</Text>
          <Text style={styles.statLabel}>Due Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.avgProgress}%</Text>
          <Text style={styles.statLabel}>Avg Progress</Text>
        </View>
      </View>

      {/* AI Daily Brief */}
      {optimization && (
        <Section title="AI Daily Brief">
          <View style={styles.briefCard}>
            <Text style={styles.briefIcon}>🤖</Text>
            <Text style={styles.briefText}>{optimization.daily_brief}</Text>
            {optimization.efficiency_score && (
              <View style={styles.efficiencyBadge}>
                <Text style={styles.efficiencyText}>
                  Efficiency Score: {optimization.efficiency_score}/100
                </Text>
              </View>
            )}
          </View>

          {/* Risk Alerts */}
          {optimization.risk_alerts && optimization.risk_alerts.length > 0 && (
            <View style={styles.alertsSection}>
              {optimization.risk_alerts.map((alert, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.riskAlert,
                    alert.severity === 'high' && styles.riskAlertHigh,
                    alert.severity === 'medium' && styles.riskAlertMedium
                  ]}
                >
                  <Text style={styles.riskAlertIcon}>
                    {alert.severity === 'high' ? '🚨' : alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
                  </Text>
                  <Text style={styles.riskAlertText}>{alert.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {optimization.recommendations && (
            <View style={styles.recommendCard}>
              <Text style={styles.recommendTitle}>💡 Recommendations</Text>
              <Text style={styles.recommendText}>{optimization.recommendations}</Text>
            </View>
          )}
        </Section>
      )}

      {/* Claims Dashboard */}
      <Section title="Today's Claims">
        {claimsWithSLA.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active claims</Text>
            <Text style={styles.emptySubtext}>
              Upload an FNOL document to get started
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.claimsScroll}>
            {claimsWithSLA.map((claim) => (
              <Pressable
                key={claim.id}
                style={[
                  styles.claimCard,
                  claim.sla_status === 'overdue' && styles.claimCardOverdue,
                  claim.sla_status === 'critical' && styles.claimCardCritical
                ]}
                onPress={() => router.push(`/claim/${claim.id}`)}
              >
                {/* SLA Timer Badge */}
                <View style={[styles.slaBadge, { backgroundColor: getSLAColor(claim.sla_status) }]}>
                  <Text style={styles.slaText}>
                    {claim.sla_status === 'overdue' 
                      ? 'OVERDUE' 
                      : claim.hours_remaining 
                        ? `${Math.round(claim.hours_remaining)}h left`
                        : 'No SLA'}
                  </Text>
                </View>

                {/* Progress Ring */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressRing}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          height: `${claim.progress_percent}%`,
                          backgroundColor: getProgressRingColor(claim.progress_percent)
                        }
                      ]}
                    />
                    <Text style={styles.progressText}>{claim.progress_percent}%</Text>
                  </View>
                </View>

                {/* Claim Info */}
                <View style={styles.claimInfo}>
                  <Text style={styles.claimNumber}>#{claim.claim_number}</Text>
                  <Text style={styles.claimType}>{claim.loss_type || 'Unknown'}</Text>
                  <Text style={styles.claimLocation} numberOfLines={1}>
                    📍 {claim.loss_location || 'No location'}
                  </Text>
                  
                  {/* Current Step */}
                  {claim.current_step && (
                    <View style={styles.currentStepBox}>
                      <Text style={styles.currentStepLabel}>Current:</Text>
                      <Text style={styles.currentStepText} numberOfLines={1}>
                        {claim.current_step.title}
                      </Text>
                    </View>
                  )}

                  {/* Steps Remaining */}
                  <Text style={styles.stepsRemaining}>
                    {claim.steps_remaining} steps remaining
                  </Text>
                </View>

                {/* Priority Score */}
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityScore}>{claim.priority_score}</Text>
                  <Text style={styles.priorityLabel}>Priority</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Section>

      {/* Optimized Route */}
      {optimization?.time_blocks && optimization.time_blocks.length > 0 && (
        <Section title="Today's Schedule">
          <View style={styles.timeline}>
            {optimization.time_blocks.map((block, idx) => (
              <View key={idx} style={styles.timeBlock}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{block.start_time}</Text>
                  <View style={styles.timeLine} />
                  <Text style={styles.timeTextEnd}>{block.end_time}</Text>
                </View>
                <View style={styles.timeContent}>
                  <Text style={styles.timeActivity}>{block.activity}</Text>
                  {block.notes && <Text style={styles.timeNotes}>{block.notes}</Text>}
                  {block.travel_minutes && (
                    <Text style={styles.travelTime}>🚗 {block.travel_minutes} min travel</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          
          <Pressable 
            style={styles.routeButton}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Text style={styles.routeButtonText}>📍 View Optimized Route on Map</Text>
          </Pressable>
        </Section>
      )}

      {/* Weather Dashboard */}
      {weather && (
        <Section title="Weather Conditions">
          <View style={styles.weatherCard}>
            <View style={styles.weatherMain}>
              <View style={styles.weatherHeader}>
                <View>
                  <Text style={styles.weatherTemp}>
                    {Math.round(weather.temperature)}°{weather.units === 'metric' ? 'C' : 'F'}
                  </Text>
                  <Text style={styles.weatherFeelsLike}>
                    Feels like {Math.round(weather.feelsLike)}°
                  </Text>
                </View>
                {weather.partOfDay && (
                  <Text style={styles.dayNightIcon}>
                    {weather.partOfDay === 'day' ? '☀️' : '🌙'}
                  </Text>
                )}
              </View>
              <Text style={styles.weatherCondition}>{weather.condition}</Text>
              {weather.location && (
                <Text style={styles.weatherLocation}>📍 {weather.location}</Text>
              )}
            </View>

            {/* Safety Assessment */}
            {isSafeForRoofInspection(weather).safe ? (
              <View style={styles.safetyBadge}>
                <Text style={styles.safetyText}>✓ Safe for outdoor inspections</Text>
              </View>
            ) : (
              <View style={[styles.safetyBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.safetyText, { color: '#DC2626' }]}>
                  ⚠️ {isSafeForRoofInspection(weather).reason}
                </Text>
              </View>
            )}

            {/* Weather Windows from AI */}
            {optimization?.weather_windows && optimization.weather_windows.length > 0 && (
              <View style={styles.weatherWindows}>
                <Text style={styles.windowsTitle}>Best Work Windows:</Text>
                {optimization.weather_windows.map((window, idx) => (
                  <View key={idx} style={styles.weatherWindow}>
                    <Text style={styles.windowTime}>
                      {window.start_time} - {window.end_time}
                    </Text>
                    <Text style={[
                      styles.windowCondition,
                      window.safe_for_outdoor && styles.windowSafe
                    ]}>
                      {window.conditions}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Section>
      )}

      {/* Quick Actions */}
      <Section title="Actions">
        <Pressable 
          style={[styles.actionButton, generatingAI && styles.actionButtonDisabled]}
          onPress={generateOptimization}
          disabled={generatingAI}
        >
          <Text style={styles.actionButtonText}>
            {generatingAI ? 'Generating AI Plan...' : '🤖 Generate New AI Optimization'}
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.secondary }]} 
          onPress={() => router.push('/(tabs)/capture')}
        >
          <Text style={styles.actionButtonText}>📸 Capture Photos</Text>
        </Pressable>
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.gold }]} 
          onPress={() => router.push('/(tabs)/claims')}
        >
          <Text style={[styles.actionButtonText, { color: colors.core }]}>📄 Upload FNOL</Text>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bgSoft 
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSoft,
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
  statCardDanger: {
    borderColor: colors.error,
    borderWidth: 2,
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

  // AI Brief Styles
  briefCard: {
    backgroundColor: colors.white,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  briefIcon: {
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  briefText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.core,
  },
  efficiencyBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },

  // Risk Alerts
  alertsSection: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  riskAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoBg,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  riskAlertMedium: {
    backgroundColor: colors.warningBg,
    borderLeftColor: colors.warning,
  },
  riskAlertHigh: {
    backgroundColor: colors.errorBg,
    borderLeftColor: colors.error,
  },
  riskAlertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  riskAlertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.core,
  },

  // Recommendations
  recommendCard: {
    backgroundColor: '#F0F9FF',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  recommendText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#075985',
  },

  // Claims Cards
  claimsScroll: {
    paddingHorizontal: 16,
  },
  claimCard: {
    width: screenWidth * 0.75,
    backgroundColor: colors.white,
    marginRight: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  claimCardOverdue: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  claimCardCritical: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  slaBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  slaText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.core,
    zIndex: 1,
  },
  claimInfo: {
    flex: 1,
  },
  claimNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.core,
    marginBottom: 4,
  },
  claimType: {
    fontSize: 13,
    color: colors.textSoft,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  claimLocation: {
    fontSize: 12,
    color: '#5F6771',
    marginBottom: 8,
  },
  currentStepBox: {
    backgroundColor: colors.bgSoft,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  currentStepLabel: {
    fontSize: 10,
    color: colors.textSoft,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  currentStepText: {
    fontSize: 12,
    color: colors.core,
    fontWeight: '500',
  },
  stepsRemaining: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 8,
  },
  priorityBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'center',
  },
  priorityScore: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  priorityLabel: {
    fontSize: 10,
    color: colors.textSoft,
    textTransform: 'uppercase',
  },

  // Timeline
  timeline: {
    paddingHorizontal: 16,
  },
  timeBlock: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timeColumn: {
    width: 80,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  timeTextEnd: {
    fontSize: 12,
    color: colors.textSoft,
  },
  timeLine: {
    width: 2,
    height: 40,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  timeContent: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  timeActivity: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  timeNotes: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: 4,
  },
  travelTime: {
    fontSize: 11,
    color: '#5F6771',
    marginTop: 6,
  },

  // Route Button
  routeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  routeButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // Weather
  weatherCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  weatherMain: {
    marginBottom: 12,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weatherTemp: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
  },
  weatherFeelsLike: {
    fontSize: 14,
    color: '#5F6771',
    marginTop: 4,
  },
  weatherCondition: {
    fontSize: 16,
    color: colors.core,
    marginTop: 4,
  },
  weatherLocation: {
    fontSize: 14,
    color: '#5F6771',
    marginTop: 6,
    fontWeight: '500',
  },
  dayNightIcon: {
    fontSize: 36,
  },
  safetyBadge: {
    backgroundColor: colors.successBg,
    padding: 10,
    borderRadius: 8,
  },
  safetyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  weatherWindows: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  windowsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 8,
  },
  weatherWindow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  windowTime: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.core,
  },
  windowCondition: {
    fontSize: 12,
    color: colors.textSoft,
  },
  windowSafe: {
    color: colors.success,
    fontWeight: '500',
  },

  // Actions
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSoft,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSoft,
    textAlign: 'center',
  },
});