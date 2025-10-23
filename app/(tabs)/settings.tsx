import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, SafeAreaView, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';
import { signOut } from '@/services/auth';
import { getSession } from '@/services/auth';

const SETTINGS_KEYS = {
  UNITS: 'settings_units', // 'metric' or 'imperial'
  DARK_MODE: 'settings_dark_mode',
  WIFI_ONLY: 'settings_wifi_only',
  EMBED_ANNOTATIONS: 'settings_embed_annotations',
  AUTO_SAVE_PHOTOS: 'settings_auto_save_photos',
  HIGH_QUALITY_PHOTOS: 'settings_high_quality_photos',
};

function ToggleRow({ 
  label, 
  description, 
  storageKey, 
  defaultValue = false 
}: { 
  label: string; 
  description?: string;
  storageKey: string; 
  defaultValue?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored !== null) setValue(stored === 'true');
    });
  }, [storageKey]);

  const handleToggle = async (newValue: boolean) => {
    setValue(newValue);
    await AsyncStorage.setItem(storageKey, String(newValue));
  };

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description && <Text style={styles.toggleDescription}>{description}</Text>}
      </View>
      <Switch 
        value={value} 
        onValueChange={handleToggle}
        trackColor={{ false: colors.line, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function UnitsToggle() {
  const [units, setUnits] = useState<'metric' | 'imperial'>('imperial');
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEYS.UNITS).then((stored) => {
      if (stored === 'metric' || stored === 'imperial') {
        setUnits(stored);
      }
    });
  }, []);

  const handleToggle = async () => {
    const newUnits = units === 'imperial' ? 'metric' : 'imperial';
    setUnits(newUnits);
    await AsyncStorage.setItem(SETTINGS_KEYS.UNITS, newUnits);
    // Refresh the home screen to show new units
    router.replace('/(tabs)/');
  };

  return (
    <Pressable style={styles.unitsCard} onPress={handleToggle}>
      <View style={styles.unitsLeft}>
        <Text style={styles.settingTitle}>Temperature & Speed Units</Text>
        <Text style={styles.settingValue}>{units === 'imperial' ? 'Fahrenheit / mph' : 'Celsius / km/h'}</Text>
      </View>
      <View style={styles.unitsPill}>
        <Text style={styles.unitsPillText}>{units === 'imperial' ? '°F' : '°C'}</Text>
      </View>
    </Pressable>
  );
}

function AccountCard() {
  const [userEmail, setUserEmail] = useState('');
  
  useEffect(() => {
    getSession().then(session => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);
  
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountIcon}>
        <Text style={styles.accountEmoji}>👤</Text>
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>John Smith</Text>
        <Text style={styles.accountEmail}>{userEmail || 'john@claimsiq.ai'}</Text>
        <Text style={styles.accountRole}>Field Adjuster • Admin</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Header title="Settings" subtitle="Manage your account and preferences" />
        
        {/* Account Info */}
        <Section title="Account">
          <AccountCard />
        </Section>

        {/* Units Preference */}
        <Section title="Display">
          <UnitsToggle />
          <ToggleRow 
            label="Dark Mode" 
            description="Use dark theme throughout the app"
            storageKey={SETTINGS_KEYS.DARK_MODE} 
            defaultValue={false}
          />
        </Section>
        
        {/* Upload Preferences */}
        <Section title="Upload & Sync">
          <ToggleRow 
            label="Wi-Fi Only Uploads" 
            description="Only upload photos when connected to Wi-Fi"
            storageKey={SETTINGS_KEYS.WIFI_ONLY} 
            defaultValue={true}
          />
          <ToggleRow 
            label="Auto-Save to Gallery" 
            description="Save captured photos to device gallery"
            storageKey={SETTINGS_KEYS.AUTO_SAVE_PHOTOS} 
            defaultValue={true}
          />
          <ToggleRow 
            label="High Quality Photos" 
            description="Use maximum quality (larger file sizes)"
            storageKey={SETTINGS_KEYS.HIGH_QUALITY_PHOTOS} 
            defaultValue={false}
          />
        </Section>
        
        {/* Report Preferences */}
        <Section title="Reports & Export">
          <ToggleRow 
            label="Embed AI Annotations" 
            description="Include AI damage detections in PDF reports"
            storageKey={SETTINGS_KEYS.EMBED_ANNOTATIONS} 
            defaultValue={true}
          />
        </Section>
        
        {/* Admin Tools */}
        <Section title="Admin Tools">
          <Pressable style={styles.menuItem} onPress={() => router.push('/admin/prompts')}>
            <Text style={styles.menuIcon}>🤖</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>AI Prompts</Text>
              <Text style={styles.menuSubtitle}>Manage AI system prompts</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          
          <Pressable style={styles.menuItem} onPress={() => router.push('/admin/credentials')}>
            <Text style={styles.menuIcon}>🔑</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>API Credentials</Text>
              <Text style={styles.menuSubtitle}>View connection details</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </Section>

        {/* Support */}
        <Section title="Support">
          <Pressable style={styles.menuItem} onPress={() => Alert.alert('Version', 'ClaimsIQ Sidekick v1.0.0\nBuild: Production')}>
            <Text style={styles.menuIcon}>ℹ️</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>About</Text>
              <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          
          <Pressable style={styles.menuItem} onPress={() => Alert.alert('Help', 'Contact support@claimsiq.ai for assistance')}>
            <Text style={styles.menuIcon}>💬</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Get Help</Text>
              <Text style={styles.menuSubtitle}>Contact support</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </Section>

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ClaimsIQ Sidekick</Text>
          <Text style={styles.footerSubtext}>© 2025 ClaimsIQ. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bgSoft 
  },
  
  // Account Card
  accountCard: {
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
  accountIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountEmoji: {
    fontSize: 28,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 14,
    color: colors.textSoft,
    marginBottom: 2,
  },
  accountRole: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  
  // Toggle Rows
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.textSoft,
    lineHeight: 18,
  },
  
  // Units Card
  unitsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitsLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: colors.textSoft,
  },
  unitsPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unitsPillText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  
  // Menu Items
  menuItem: {
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
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.textSoft,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.textLight,
    fontWeight: '300',
  },
  
  // Sign Out
  signOutContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  signOutButton: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textLight,
  },
});