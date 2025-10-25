// Analytics Service
// Track user behavior, feature usage, and app performance

import { supabase } from '@/utils/supabase';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { getUserSettings } from './settings';

let sessionId: string | null = null;
let currentScreen: string | null = null;
let analyticsEnabled = true;

export interface AnalyticsEvent {
  event_type: string;
  event_name: string;
  event_category?: string;
  properties?: Record<string, any>;
  duration_ms?: number;
  screen_name?: string;
  previous_screen?: string;
}

/**
 * Initialize analytics session
 */
export function initAnalytics(): void {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  trackEvent({
    event_type: 'session',
    event_name: 'session_start',
    event_category: 'lifecycle',
  });
}

/**
 * End analytics session
 */
export function endAnalytics(): void {
  if (!sessionId) return;

  trackEvent({
    event_type: 'session',
    event_name: 'session_end',
    event_category: 'lifecycle',
  });

  sessionId = null;
}

/**
 * Check if analytics is enabled for the user
 */
async function checkAnalyticsEnabled(userId: string): Promise<boolean> {
  try {
    const settings = await getUserSettings(userId);
    return settings?.share_analytics ?? true;
  } catch {
    return true; // Default to enabled
  }
}

/**
 * Track an analytics event
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  if (!analyticsEnabled) return;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has analytics enabled
    const enabled = await checkAnalyticsEnabled(user.id);
    if (!enabled) return;

    // Get device info
    const deviceInfo = {
      platform: Platform.OS,
      app_version: Application.nativeApplicationVersion || '1.0.0',
      device_model: Device.modelName || 'Unknown',
      os_version: `${Platform.OS} ${Platform.Version}`,
    };

    // Insert event
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      session_id: sessionId,
      event_type: event.event_type,
      event_name: event.event_name,
      event_category: event.event_category,
      properties: event.properties || {},
      duration_ms: event.duration_ms,
      screen_name: event.screen_name || currentScreen,
      previous_screen: event.previous_screen,
      ...deviceInfo,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    // Don't throw - analytics should never break the app
  }
}

/**
 * Track screen view
 */
export function trackScreenView(screenName: string): void {
  const previousScreen = currentScreen;
  currentScreen = screenName;

  trackEvent({
    event_type: 'screen_view',
    event_name: screenName,
    event_category: 'navigation',
    screen_name: screenName,
    previous_screen: previousScreen || undefined,
  });
}

/**
 * Track button click
 */
export function trackButtonClick(buttonName: string, properties?: Record<string, any>): void {
  trackEvent({
    event_type: 'button_click',
    event_name: buttonName,
    event_category: 'interaction',
    properties,
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUse(
  featureName: string,
  properties?: Record<string, any>
): void {
  trackEvent({
    event_type: 'feature_use',
    event_name: featureName,
    event_category: 'feature',
    properties,
  });
}

/**
 * Track timed operation
 */
export class PerformanceTracker {
  private startTime: number;
  private operationName: string;

  constructor(operationName: string) {
    this.operationName = operationName;
    this.startTime = Date.now();
  }

  end(properties?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    trackEvent({
      event_type: 'performance',
      event_name: this.operationName,
      event_category: 'timing',
      duration_ms: duration,
      properties: {
        ...properties,
        duration_seconds: (duration / 1000).toFixed(2),
      },
    });
  }
}

/**
 * Track photo capture
 */
export function trackPhotoCapture(properties?: { claim_id?: string; type?: string }): void {
  trackEvent({
    event_type: 'feature_use',
    event_name: 'photo_captured',
    event_category: 'capture',
    properties,
  });
}

/**
 * Track photo upload
 */
export function trackPhotoUpload(
  success: boolean,
  properties?: { file_size?: number; duration_ms?: number }
): void {
  trackEvent({
    event_type: success ? 'feature_use' : 'error',
    event_name: success ? 'photo_uploaded' : 'photo_upload_failed',
    event_category: 'upload',
    properties,
  });
}

/**
 * Track workflow generation
 */
export function trackWorkflowGeneration(
  success: boolean,
  properties?: { claim_id?: string; workflow_type?: string }
): void {
  trackEvent({
    event_type: success ? 'feature_use' : 'error',
    event_name: success ? 'workflow_generated' : 'workflow_generation_failed',
    event_category: 'ai',
    properties,
  });
}

/**
 * Track AI annotation
 */
export function trackAIAnnotation(
  success: boolean,
  properties?: { media_id?: string; detection_count?: number; duration_ms?: number }
): void {
  trackEvent({
    event_type: success ? 'feature_use' : 'error',
    event_name: success ? 'ai_annotation_completed' : 'ai_annotation_failed',
    event_category: 'ai',
    properties,
  });
}

/**
 * Track PDF export
 */
export function trackPDFExport(
  success: boolean,
  properties?: { claim_id?: string; page_count?: number; file_size?: number }
): void {
  trackEvent({
    event_type: success ? 'feature_use' : 'error',
    event_name: success ? 'pdf_exported' : 'pdf_export_failed',
    event_category: 'export',
    properties,
  });
}

/**
 * Track search
 */
export function trackSearch(query: string, screen: string, resultCount: number): void {
  trackEvent({
    event_type: 'feature_use',
    event_name: 'search',
    event_category: 'interaction',
    properties: {
      query_length: query.length,
      screen,
      result_count: resultCount,
    },
  });
}

/**
 * Track filter usage
 */
export function trackFilterUse(filterType: string, filterValue: string, screen: string): void {
  trackEvent({
    event_type: 'feature_use',
    event_name: 'filter_applied',
    event_category: 'interaction',
    properties: {
      filter_type: filterType,
      filter_value: filterValue,
      screen,
    },
  });
}

/**
 * Track error
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  properties?: Record<string, any>
): void {
  trackEvent({
    event_type: 'error',
    event_name: errorType,
    event_category: 'error',
    properties: {
      error_message: errorMessage,
      ...properties,
    },
  });
}

/**
 * Get analytics summary for admin dashboard
 */
export async function getAnalyticsSummary(
  startDate: string,
  endDate: string
): Promise<{
  total_events: number;
  unique_users: number;
  screen_views: number;
  feature_uses: number;
  errors: number;
  avg_session_duration: number;
}> {
  try {
    const { data, error } = await supabase.rpc('get_analytics_summary', {
      start_date: startDate,
      end_date: endDate,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get analytics summary:', error);
    throw error;
  }
}

/**
 * Get top features by usage
 */
export async function getTopFeatures(limit = 10): Promise<
  Array<{
    feature_name: string;
    usage_count: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_name')
      .eq('event_type', 'feature_use')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000);

    if (error) throw error;

    // Count occurrences
    const counts: Record<string, number> = {};
    data.forEach((event) => {
      counts[event.event_name] = (counts[event.event_name] || 0) + 1;
    });

    // Sort and limit
    return Object.entries(counts)
      .map(([feature_name, usage_count]) => ({ feature_name, usage_count }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get top features:', error);
    return [];
  }
}

/**
 * Disable analytics (for testing or user preference)
 */
export function disableAnalytics(): void {
  analyticsEnabled = false;
}

/**
 * Enable analytics
 */
export function enableAnalytics(): void {
  analyticsEnabled = true;
}
