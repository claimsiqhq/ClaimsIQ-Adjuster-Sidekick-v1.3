// app/(tabs)/settings.tsx
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';
import { signOut } from '@/services/auth';
import { useRouter } from 'expo-router';

function Row({ label }: { label: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Switch />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Header title="Settings" subtitle="Accounts, data, preferences." />
      <Section title="Accounts">
        <Text style={styles.li}>• Supabase: Connected</Text>
        <Text style={styles.li}>• Microsoft 365: Not linked</Text>
        <Text style={styles.li}>• Vapi: Not linked</Text>
      </Section>
      <Section title="Preferences">
        <Row label="Dark Mode" />
        <Row label="Auto-upload on Wi-Fi only" />
        <Row label="Embed annotations in report exports" />
      </Section>
      <Section title="Session">
        <Pressable style={styles.link} onPress={async () => { await signOut(); router.replace('/auth/login'); }}>
          <Text style={styles.linkTxt}>Sign Out</Text>
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
  linkTxt: { color: colors.white, fontWeight: '700' },
});
