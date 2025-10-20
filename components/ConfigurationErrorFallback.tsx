import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/theme/colors';

type Props = {
  error: Error;
  resetError: () => void;
};

export function ConfigurationErrorFallback({ error, resetError }: Props) {
  // Check if this is a Supabase configuration error
  const isConfigError = error.message?.includes('SUPABASE') || error.message?.includes('Supabase');
  const missingKeys: string[] = [];
  
  // Try to parse missing keys from error message
  if (isConfigError && error.message) {
    if (error.message.includes('EXPO_PUBLIC_SUPABASE_URL')) {
      missingKeys.push('EXPO_PUBLIC_SUPABASE_URL');
    }
    if (error.message.includes('EXPO_PUBLIC_SUPABASE_API_KEY')) {
      missingKeys.push('EXPO_PUBLIC_SUPABASE_API_KEY');
    }
  }
  
  const instructions = isConfigError ? 
    '1. Copy .env.example to .env in the project root.\n' +
    '2. Paste the Supabase Project URL into EXPO_PUBLIC_SUPABASE_URL.\n' +
    '3. Paste the Supabase anon public API key into EXPO_PUBLIC_SUPABASE_API_KEY.\n' +
    '4. Restart the Expo development server.' : null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Supabase configuration required</Text>
        <Text style={styles.message}>
          {isConfigError
            ? 'We could not start the Supabase client because the required environment variables are missing.'
            : 'We hit an unexpected error while starting the Supabase client.'}
        </Text>

        {missingKeys.length > 0 && (
          <View style={styles.list}>
            <Text style={styles.listTitle}>Missing variables:</Text>
            {missingKeys.map((variable: string) => (
              <Text key={variable} style={styles.listItem}>
                • {variable}
              </Text>
            ))}
          </View>
        )}

        {instructions && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to fix it locally:</Text>
            {instructions.split('\n').map((line: string) => (
              <Text key={line} style={styles.instructionsItem}>
                {line}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.tip}>
          Tip: run <Text style={styles.code}>cp .env.example .env</Text> from the project root, then paste your Supabase
          credentials and restart Expo.
        </Text>

        <Pressable style={styles.button} onPress={resetError}>
          <Text style={styles.buttonText}>Reload app</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.core,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#4A5568',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    marginBottom: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#2D3748',
  },
  listItem: {
    fontSize: 14,
    color: '#2D3748',
  },
  instructions: {
    marginBottom: 16,
    backgroundColor: '#EBF4FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C3DAFE',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#2A4365',
  },
  instructionsItem: {
    fontSize: 14,
    color: '#2A4365',
  },
  tip: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 20,
    textAlign: 'center',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ConfigurationErrorFallback;
