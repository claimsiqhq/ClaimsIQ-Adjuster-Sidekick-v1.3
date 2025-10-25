// User Settings Service
// Manages user preferences with Supabase sync and local cache

import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  org_id: string | null;
  org_name: string | null;
  role: 'admin' | 'manager' | 'adjuster' | 'viewer';
  metadata: Record<string, any>;
}

export interface UserSettings {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;

  // Display
  units: 'metric' | 'imperial';
  dark_mode: boolean;
  language: string;

  // Upload & Sync
  wifi_only_uploads: boolean;
  auto_save_photos: boolean;
  high_quality_photos: boolean;
  auto_sync: boolean;
  sync_frequency: 'immediate' | 'hourly' | 'daily';

  // Reports
  embed_annotations: boolean;
  pdf_template: 'standard' | 'detailed' | 'summary';
  include_photos: boolean;
  watermark_pdfs: boolean;

  // Notifications
  push_enabled: boolean;
  email_notifications: boolean;
  notify_claim_updates: boolean;
  notify_ai_complete: boolean;
  notify_team_activity: boolean;

  // Privacy
  share_analytics: boolean;
  offline_mode: boolean;
  auto_delete_old_media: boolean;
  media_retention_days: number;

  // Advanced
  enable_experimental: boolean;
  debug_mode: boolean;
}

const SETTINGS_CACHE_KEY = 'user_settings_cache';
const PROFILE_CACHE_KEY = 'user_profile_cache';

/**
 * Get user profile from Supabase
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Try cache first
    const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      const profile = JSON.parse(cached);
      // Use cache if less than 5 minutes old
      if (Date.now() - profile._cached_at < 5 * 60 * 1000) {
        return profile;
      }
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Cache result
    const profileWithTimestamp = { ...data, _cached_at: Date.now() };
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileWithTimestamp));

    return data as UserProfile;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);

    return data as UserProfile;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
}

/**
 * Get user settings from Supabase
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    // Try cache first
    const cached = await AsyncStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      const settings = JSON.parse(cached);
      // Use cache if less than 1 minute old
      if (Date.now() - settings._cached_at < 60 * 1000) {
        return settings;
      }
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    // If no settings exist, create default ones
    if (!data) {
      return await createDefaultSettings(userId);
    }

    // Cache result
    const settingsWithTimestamp = { ...data, _cached_at: Date.now() };
    await AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settingsWithTimestamp));

    return data as UserSettings;
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return null;
  }
}

/**
 * Create default settings for new user
 */
async function createDefaultSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as UserSettings;
  } catch (error) {
    console.error('Failed to create default settings:', error);
    return null;
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Clear cache
    await AsyncStorage.removeItem(SETTINGS_CACHE_KEY);

    return data as UserSettings;
  } catch (error) {
    console.error('Failed to update user settings:', error);
    throw error;
  }
}

/**
 * Sync local AsyncStorage settings to Supabase
 * Useful for migrating from old local-only settings
 */
export async function syncLocalSettingsToSupabase(userId: string): Promise<void> {
  try {
    const localSettings: Partial<UserSettings> = {};

    // Read from AsyncStorage
    const units = await AsyncStorage.getItem('settings_units');
    if (units) localSettings.units = units as any;

    const darkMode = await AsyncStorage.getItem('settings_dark_mode');
    if (darkMode) localSettings.dark_mode = darkMode === 'true';

    const wifiOnly = await AsyncStorage.getItem('settings_wifi_only');
    if (wifiOnly) localSettings.wifi_only_uploads = wifiOnly === 'true';

    const autoSave = await AsyncStorage.getItem('settings_auto_save_photos');
    if (autoSave) localSettings.auto_save_photos = autoSave === 'true';

    const highQuality = await AsyncStorage.getItem('settings_high_quality_photos');
    if (highQuality) localSettings.high_quality_photos = highQuality === 'true';

    const embedAnnos = await AsyncStorage.getItem('settings_embed_annotations');
    if (embedAnnos) localSettings.embed_annotations = embedAnnos === 'true';

    // Update Supabase if we found any local settings
    if (Object.keys(localSettings).length > 0) {
      await updateUserSettings(userId, localSettings);
    }
  } catch (error) {
    console.error('Failed to sync local settings:', error);
  }
}

/**
 * Clear all settings cache
 */
export async function clearSettingsCache(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_CACHE_KEY);
  await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
}

/**
 * Export user data (GDPR compliance)
 */
export async function exportUserData(userId: string): Promise<string> {
  try {
    const profile = await getUserProfile(userId);
    const settings = await getUserSettings(userId);

    const exportData = {
      profile,
      settings,
      exported_at: new Date().toISOString(),
      format_version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export user data:', error);
    throw error;
  }
}
