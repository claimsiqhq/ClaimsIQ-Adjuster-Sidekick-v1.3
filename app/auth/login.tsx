// app/auth/login.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, Switch } from 'react-native';
import { colors } from '@/theme/colors';
import { signIn, signUpAdmin, setDevCreds, getDevCreds } from '@/services/auth';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const dev = await getDevCreds();
        setEmail(dev.email);
        setPassword(dev.password);
        setRemember(dev.remember);
      } catch (error) {
        console.log('Error loading dev creds:', error);
        // Continue without pre-filled credentials
      }
    })();
  }, []);

  async function ensureAdmin() {
    setBusy(true);
    try {
      await signUpAdmin(email.trim(), password);
      Alert.alert('Admin Ready', 'Account ensured. You can now sign in.');
    } catch (e: any) {
      Alert.alert('Error', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function doLogin() {
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      await setDevCreds(email.trim(), password, remember);
      router.replace('/today');
    } catch (e: any) {
      Alert.alert('Login failed', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>iQ</Text>
        </View>
        <Text style={styles.brandTitle}>Claims iQ</Text>
        <Text style={styles.brandSubtitle}>Sidekick</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" style={styles.input} />

        <View style={styles.row}>
          <Text style={styles.small}>Remember dev creds</Text>
          <Switch value={remember} onValueChange={setRemember} />
        </View>

        <Pressable style={[styles.btn, styles.primary, busy && styles.dim]} disabled={busy} onPress={doLogin}>
          <Text style={styles.btnTxt}>Sign In</Text>
</Pressable>

        <Pressable style={[styles.btn, styles.secondary, busy && styles.dim]} disabled={busy} onPress={ensureAdmin}>
          <Text style={styles.btnTxtDark}>Create/Ensure Admin</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>Configure dev credentials in .env file</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft, padding: 20, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { 
    width: 80, 
    height: 80, 
    borderRadius: 20, 
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: { fontSize: 32, fontWeight: '900', color: colors.white },
  brandTitle: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  brandSubtitle: { fontSize: 16, fontWeight: '600', color: colors.secondary, letterSpacing: 2 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line },
  label: { color: colors.core, fontWeight: '600', marginTop: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, color: colors.core, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.gold },
  btnTxt: { color: colors.white, fontWeight: '700' },
  btnTxtDark: { color: colors.core, fontWeight: '700' },
  small: { color: colors.textLight },
  dim: { opacity: 0.6 },
  hint: { textAlign: 'center', color: colors.textLight, marginTop: 12 }
});
