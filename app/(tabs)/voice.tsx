
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useLiveSupport } from '@/modules/voice/hooks/useLiveSupport';
import { WelcomeScreen } from '@/modules/voice/components/WelcomeScreen';
import { StatusIndicator } from '@/modules/voice/components/StatusIndicator';
import { SupportIcon } from '@/modules/voice/components/SupportIcon';
import { TranscriptionView } from '@/modules/voice/components/TranscriptionView';
import { colors } from '@/theme/colors';

export default function VoiceAgentScreen() {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  let hookData;
  try {
    hookData = useLiveSupport();
  } catch (error: any) {
    // Catch initialization errors
    if (!hasError) {
      setHasError(true);
      setErrorMessage(error.message || 'Failed to initialize Voice Agent');
    }
    hookData = {
      isSessionActive: false,
      startSession: async () => {},
      stopSession: async () => {},
      transcripts: [],
      currentAgentTranscript: '',
      currentUserTranscript: '',
      status: 'error' as const,
      error: error.message,
    };
  }

  const {
    isSessionActive,
    startSession,
    stopSession,
    transcripts,
    currentAgentTranscript,
    currentUserTranscript,
    status,
    error,
  } = hookData;

  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={[styles.main, styles.errorContainer]}>
          <Text style={styles.errorTitle}>Voice Agent Unavailable</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.errorHint}>
            This feature requires:
            {'\n'}• Gemini API key configured in app settings
            {'\n'}• Microphone permissions
            {'\n'}• Audio playback capabilities
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setErrorMessage('');
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <StatusIndicator status={status} />
      </View>
      <View style={styles.main}>
        {!isSessionActive && transcripts.length === 0 && <WelcomeScreen />}
        <TranscriptionView
          transcripts={transcripts}
          currentAgentTranscript={currentAgentTranscript}
          currentUserTranscript={currentUserTranscript}
        />
      </View>
      <View style={styles.footer}>
        <SupportIcon
          status={status}
          onClick={isSessionActive ? stopSession : startSession}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  main: {
    flex: 1,
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.core,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  errorHint: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'left',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
