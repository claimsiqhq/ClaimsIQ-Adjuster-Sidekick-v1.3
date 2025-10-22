// app/admin/credentials.tsx
// Admin screen to view and manage embedded credentials

import { ScrollView, StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { APP_CREDENTIALS } from '@/config/credentials';
import Header from '@/components/Header';
import Section from '@/components/Section';

export default function CredentialsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>App Credentials</Text>
          <View style={{ width: 60 }} />
        </View>

        <Section title="Supabase Configuration">
        <InfoRow label="URL" value={APP_CREDENTIALS.supabase.url} />
        <InfoRow 
          label="Anon Key" 
          value={APP_CREDENTIALS.supabase.anonKey.substring(0, 30) + '...'} 
        />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✅ Hardcoded - Always Available</Text>
        </View>
      </Section>

      <Section title="Default Login">
        <InfoRow label="Email" value={APP_CREDENTIALS.defaultLogin.email} />
        <InfoRow label="Password" value="•••••••••" />
      </Section>

      <Section title="API Keys">
        <InfoRow 
          label="OpenAI" 
          value={APP_CREDENTIALS.apis.openai ? 'Configured' : 'Not Set'} 
        />
        <InfoRow 
          label="Weather (Weatherbit.io)" 
          value={APP_CREDENTIALS.apis.weather ? 'Configured' : 'Not Set'} 
        />
        <InfoRow 
          label="Google Maps" 
          value={APP_CREDENTIALS.apis.google ? 'Configured' : 'Not Set'} 
        />
      </Section>

      <Section title="Information">
        <Text style={styles.infoText}>
          All credentials are embedded in the app for maximum reliability. 
          The app will work even if environment variables fail to load.
          {'\n\n'}
          To update credentials, modify config/credentials.ts and rebuild.
        </Text>
      </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.light,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.core,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: colors.textLight,
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: colors.successBg,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

