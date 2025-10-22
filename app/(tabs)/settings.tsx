import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { SyncStatus } from '@/components/SyncStatus';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';
import { signOut } from '@/services/auth';

const SETTINGS_KEYS = {
  DARK_MODE: 'settings_dark_mode',
  WIFI_ONLY: 'settings_wifi_only',
  EMBED_ANNOTATIONS: 'settings_embed_annotations',
  UNITS: 'settings_units', // 'metric' or 'imperial'
};

function Row({ label, storageKey }: { label: string; storageKey: string }) {
  const [value, setValue] = useState(false);

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
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Switch value={value} onValueChange={handleToggle} />
    </View>
  );
}

function UnitsRow() {
  const [units, setUnits] = useState<'metric' | 'imperial'>('imperial');

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
  };

  return (
    <Pressable style={rowStyles.row} onPress={handleToggle}>
      <Text style={rowStyles.label}>Temperature Units</Text>
      <View style={rowStyles.unitsContainer}>
        <Text style={[rowStyles.unitOption, units === 'imperial' && rowStyles.unitActive]}>
          °F / mph
        </Text>
        <Text style={rowStyles.unitDivider}>|</Text>
        <Text style={[rowStyles.unitOption, units === 'metric' && rowStyles.unitActive]}>
          °C / km/h
        </Text>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" subtitle="Accounts, data, preferences." />
      <Section title="Sync Status">
        <SyncStatus />
      </Section>
      <Section title="Accounts">
        <Text style={styles.li}>• Supabase: Connected</Text>
        <Text style={styles.li}>• Microsoft 365: Not linked</Text>
        <Text style={styles.li}>• Vapi: Not linked</Text>
      </Section>
      <Section title="Preferences">
        <UnitsRow />
        <Row label="Dark Mode" storageKey={SETTINGS_KEYS.DARK_MODE} />
        <Row label="Auto-upload on Wi-Fi only" storageKey={SETTINGS_KEYS.WIFI_ONLY} />
        <Row label="Embed annotations in report exports" storageKey={SETTINGS_KEYS.EMBED_ANNOTATIONS} />
      </Section>
      <Section title="Admin">
        <Pressable style={styles.link} onPress={() => router.push('/admin/prompts')}>
          <Text style={styles.linkTxt}>AI Prompts</Text>
        </Pressable>
        <Pressable style={[styles.link, { backgroundColor: colors.light, marginTop: 8 }]} onPress={() => router.push('/admin/credentials')}>
          <Text style={[styles.linkTxt, { color: colors.primary }]}>View Credentials</Text>
        </Pressable>
      </Section>
      <Section title="Session">
        <Pressable style={[styles.link, { backgroundColor: colors.gold }]} onPress={async () => { await signOut(); router.replace('/auth/login'); }}>
          <Text style={[styles.linkTxt, { color: colors.core }]}>Sign Out</Text>
        </Pressable>
      </Section>
    </SafeAreaView>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, marginBottom: 8, marginHorizontal: 16 },
  label: { color: colors.core, fontWeight: '500' },
  unitsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitOption: { fontSize: 14, color: colors.textSoft },
  unitActive: { color: colors.primary, fontWeight: '600' },
  unitDivider: { color: colors.line }
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  li: { color: '#2B2F36', marginBottom: 6, marginHorizontal: 16 },
  link: { backgroundColor: colors.primary, padding: 12, marginHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  linkTxt: { color: colors.white, fontWeight: '700' }
});
