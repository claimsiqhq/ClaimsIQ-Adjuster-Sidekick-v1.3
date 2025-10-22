
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLiveSupport } from './voice/hooks/useLiveSupport';
import { WelcomeScreen } from './voice/components/WelcomeScreen';
import { StatusIndicator } from './voice/components/StatusIndicator';
import { SupportIcon } from './voice/components/SupportIcon';
import { TranscriptionView } from './voice/components/TranscriptionView';
import { colors } from '@/theme/colors';

export default function VoiceAgentScreen() {
  const {
    isSessionActive,
    startSession,
    stopSession,
    transcripts,
    currentAgentTranscript,
    currentUserTranscript,
    status,
    error,
  } = useLiveSupport();

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
});
