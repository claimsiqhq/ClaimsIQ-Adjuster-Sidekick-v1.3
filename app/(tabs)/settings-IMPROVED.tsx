// Improved Settings Screen with Supabase Sync
// All settings are saved to Supabase and synced across devices

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/Header';
import Section from '@/components/Section';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { textStyles } from '@/theme/typography';
import { useRouter } from 'expo-router';
import { signOut, getSession } from '@/services/auth';
import {
  getUserProfile,
  getUserSettings,
  updateUserProfile,
  updateUserSettings,
  syncLocalSettingsToSupabase,
  exportUserData,
  UserProfile,
  UserSettings,
} from '@/services/settings';
import { trackScreenView, trackButtonClick, trackFeatureUse } from '@/services/analytics';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Edit mode
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');

  useEffect(() => {
    trackScreenView('settings');
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user?.id) {
        router.replace('/auth/login');
        return;
      }

      setUserId(session.user.id);

      // Sync old local settings to Supabase (one-time migration)
      await syncLocalSettingsToSupabase(session.user.id);

      // Load profile and settings
      const [userProfile, userSettings] = await Promise.all([
        getUserProfile(session.user.id),
        getUserSettings(session.user.id),
      ]);

      setProfile(userProfile);
      setSettings(userSettings);
      setEditedName(userProfile?.full_name || '');
      setEditedPhone(userProfile?.phone || '');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) {
    if (!userId || !settings) return;

    try {
      const updated = await updateUserSettings(userId, { [key]: value });
      if (updated) {
        setSettings(updated);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save setting: ' + error.message);
    }
  }

  async function saveProfile() {
    if (!userId || !profile) return;

    try {
      setSaving(true);
      const updated = await updateUserProfile(userId, {
        full_name: editedName,
        phone: editedPhone,
      });

      if (updated) {
        setProfile(updated);
        setEditingProfile(false);
        Alert.alert('Success', 'Profile updated successfully');
        trackFeatureUse('profile_updated');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    trackButtonClick('sign_out');
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  }

  async function handleExportData() {
    if (!userId) return;

    try {
      trackButtonClick('export_data');
      Alert.alert(
        'Export Data',
        'This will download all your data in JSON format.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              const data = await exportUserData(userId);
              // TODO: Save to file and share
              Alert.alert('Success', 'Data exported successfully');
              console.log('Exported data:', data);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to export data: ' + error.message);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Header title="Settings" subtitle="Manage your preferences" />

        {/* Profile Section */}
        <Section title="Profile">
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={64} color={colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                {editingProfile ? (
                  <>
                    <TextInput
                      style={styles.input}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder="Full Name"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={styles.input}
                      value={editedPhone}
                      onChangeText={setEditedPhone}
                      placeholder="Phone Number"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.profileName}>
                      {profile?.full_name || 'No name set'}
                    </Text>
                    <Text style={styles.profileEmail}>{profile?.email}</Text>
                    <Text style={styles.profileRole}>
                      {profile?.role || 'Adjuster'} {profile?.org_name && `• ${profile.org_name}`}
                    </Text>
                    {profile?.phone && (
                      <Text style={styles.profilePhone}>{profile.phone}</Text>
                    )}
                  </>
                )}
              </View>
            </View>
            <View style={styles.profileActions}>
              {editingProfile ? (
                <>
                  <Button
                    title="Save"
                    onPress={saveProfile}
                    variant="primary"
                    size="small"
                    loading={saving}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setEditingProfile(false);
                      setEditedName(profile?.full_name || '');
                      setEditedPhone(profile?.phone || '');
                    }}
                    variant="outline"
                    size="small"
                    style={{ flex: 1 }}
                  />
                </>
              ) : (
                <Button
                  title="Edit Profile"
                  onPress={() => setEditingProfile(true)}
                  variant="outline"
                  size="small"
                  icon="create-outline"
                  fullWidth
                />
              )}
            </View>
          </Card>
        </Section>

        {/* Display Preferences */}
        <Section title="Display">
          <ToggleRow
            label="Units"
            description={settings?.units === 'imperial' ? 'Fahrenheit / mph' : 'Celsius / km/h'}
            icon="thermometer-outline"
            value={settings?.units === 'metric'}
            onValueChange={(value) => updateSetting('units', value ? 'metric' : 'imperial')}
          />
          <ToggleRow
            label="Dark Mode"
            description="Use dark theme (coming soon)"
            icon="moon-outline"
            value={settings?.dark_mode || false}
            onValueChange={(value) => updateSetting('dark_mode', value)}
            disabled
          />
        </Section>

        {/* Upload & Sync */}
        <Section title="Upload & Sync">
          <ToggleRow
            label="Wi-Fi Only Uploads"
            description="Only upload photos when connected to Wi-Fi"
            icon="wifi-outline"
            value={settings?.wifi_only_uploads ?? true}
            onValueChange={(value) => updateSetting('wifi_only_uploads', value)}
          />
          <ToggleRow
            label="Auto-Save to Gallery"
            description="Save captured photos to device gallery"
            icon="images-outline"
            value={settings?.auto_save_photos ?? true}
            onValueChange={(value) => updateSetting('auto_save_photos', value)}
          />
          <ToggleRow
            label="High Quality Photos"
            description="Use maximum quality (larger file sizes)"
            icon="image-outline"
            value={settings?.high_quality_photos ?? false}
            onValueChange={(value) => updateSetting('high_quality_photos', value)}
          />
          <ToggleRow
            label="Auto Sync"
            description="Automatically sync data in background"
            icon="sync-outline"
            value={settings?.auto_sync ?? true}
            onValueChange={(value) => updateSetting('auto_sync', value)}
          />
        </Section>

        {/* Reports & Export */}
        <Section title="Reports & Export">
          <ToggleRow
            label="Embed AI Annotations"
            description="Include AI detections in PDF reports"
            icon="analytics-outline"
            value={settings?.embed_annotations ?? true}
            onValueChange={(value) => updateSetting('embed_annotations', value)}
          />
          <ToggleRow
            label="Include Photos"
            description="Attach photos to PDF reports"
            icon="camera-outline"
            value={settings?.include_photos ?? true}
            onValueChange={(value) => updateSetting('include_photos', value)}
          />
          <ToggleRow
            label="Watermark PDFs"
            description="Add ClaimsIQ watermark to exports"
            icon="water-outline"
            value={settings?.watermark_pdfs ?? false}
            onValueChange={(value) => updateSetting('watermark_pdfs', value)}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <ToggleRow
            label="Push Notifications"
            description="Receive push notifications"
            icon="notifications-outline"
            value={settings?.push_enabled ?? true}
            onValueChange={(value) => updateSetting('push_enabled', value)}
          />
          <ToggleRow
            label="Email Notifications"
            description="Receive email updates"
            icon="mail-outline"
            value={settings?.email_notifications ?? true}
            onValueChange={(value) => updateSetting('email_notifications', value)}
          />
          <ToggleRow
            label="Claim Updates"
            description="Notify when claims are updated"
            icon="folder-outline"
            value={settings?.notify_claim_updates ?? true}
            onValueChange={(value) => updateSetting('notify_claim_updates', value)}
          />
          <ToggleRow
            label="AI Processing Complete"
            description="Notify when AI annotation finishes"
            icon="sparkles-outline"
            value={settings?.notify_ai_complete ?? true}
            onValueChange={(value) => updateSetting('notify_ai_complete', value)}
          />
        </Section>

        {/* Privacy & Data */}
        <Section title="Privacy & Data">
          <ToggleRow
            label="Share Analytics"
            description="Help improve ClaimsIQ with usage data"
            icon="stats-chart-outline"
            value={settings?.share_analytics ?? true}
            onValueChange={(value) => updateSetting('share_analytics', value)}
          />
          <ToggleRow
            label="Offline Mode"
            description="Work offline (sync when connected)"
            icon="cloud-offline-outline"
            value={settings?.offline_mode ?? false}
            onValueChange={(value) => updateSetting('offline_mode', value)}
          />
          <MenuItem
            icon="download-outline"
            title="Export My Data"
            subtitle="Download all your data (GDPR)"
            onPress={handleExportData}
          />
        </Section>

        {/* Admin Tools */}
        {profile?.role === 'admin' && (
          <Section title="Admin Tools">
            <MenuItem
              icon="terminal-outline"
              title="AI Prompts"
              subtitle="Manage AI system prompts"
              onPress={() => {
                trackButtonClick('admin_prompts');
                router.push('/admin/prompts');
              }}
            />
            <MenuItem
              icon="key-outline"
              title="API Credentials"
              subtitle="View connection details"
              onPress={() => {
                trackButtonClick('admin_credentials');
                router.push('/admin/credentials');
              }}
            />
            <MenuItem
              icon="bar-chart-outline"
              title="Analytics Dashboard"
              subtitle="View usage statistics"
              onPress={() => {
                trackButtonClick('admin_analytics');
                router.push('/admin/analytics');
              }}
            />
          </Section>
        )}

        {/* Support */}
        <Section title="Support">
          <MenuItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.3.0"
            onPress={() =>
              Alert.alert(
                'About ClaimsIQ',
                'ClaimsIQ Adjuster Sidekick v1.3.0\nBuild: Production\n\n© 2025 ClaimsIQ. All rights reserved.'
              )
            }
          />
          <MenuItem
            icon="help-circle-outline"
            title="Get Help"
            subtitle="Contact support@claimsiq.ai"
            onPress={() =>
              Alert.alert(
                'Support',
                'Need help? Contact us at:\nsupport@claimsiq.ai\n\nResponse time: Within 24 hours'
              )
            }
          />
        </Section>

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            size="medium"
            icon="log-out-outline"
            fullWidth
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ClaimsIQ Adjuster Sidekick</Text>
          <Text style={styles.footerSubtext}>
            © {new Date().getFullYear()} ClaimsIQ. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  description,
  icon,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Card style={styles.settingCard}>
      <View style={styles.settingContent}>
        <Ionicons name={icon} size={24} color={colors.primary} style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.line, true: colors.primary }}
          thumbColor={colors.white}
          disabled={disabled}
        />
      </View>
    </Card>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.menuCard} onPress={onPress}>
      <View style={styles.menuContent}>
        <Ionicons name={icon} size={24} color={colors.primary} style={styles.menuIcon} />
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...textStyles.body,
    marginTop: spacing.md,
  },

  // Profile
  profileCard: {
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...textStyles.h3,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    ...textStyles.bodySmall,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...textStyles.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  profilePhone: {
    ...textStyles.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  profileActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    ...textStyles.body,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },

  // Settings Cards
  settingCard: {
    marginBottom: spacing.sm,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...textStyles.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...textStyles.bodySmall,
    color: colors.textLight,
  },

  // Menu Items
  menuCard: {
    marginBottom: spacing.sm,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    ...textStyles.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuSubtitle: {
    ...textStyles.bodySmall,
    color: colors.textLight,
  },

  // Sign Out
  signOutContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xl,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
  },
  footerText: {
    ...textStyles.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  footerSubtext: {
    ...textStyles.caption,
    color: colors.textLight,
  },
});
