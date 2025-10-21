import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
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

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
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
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, marginBottom: 8, marginHorizontal: 16 },
  label: { color: colors.core, fontWeight: '500' }
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  li: { color: '#2B2F36', marginBottom: 6, marginHorizontal: 16 },
  link: { backgroundColor: colors.primary, padding: 12, marginHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  linkTxt: { color: colors.white, fontWeight: '700' }
});
