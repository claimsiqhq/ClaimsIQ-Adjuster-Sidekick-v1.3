
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionStatus } from '../types';
import { colors } from '@/theme/colors';

interface StatusIndicatorProps {
  status: SessionStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = (): { text: string; color: string } => {
    switch (status) {
      case 'idle':
        return { text: 'Idle', color: colors.textLight };
      case 'connecting':
        return { text: 'Connecting...', color: colors.warning };
      case 'listening':
        return { text: 'Listening', color: colors.success };
      case 'speaking':
        return { text: 'Speaking', color: colors.primary };
      case 'error':
        return { text: 'Error', color: colors.error };
      case 'closing':
        return { text: 'Closing...', color: colors.textLight };
      default:
        return { text: 'Offline', color: colors.textLight };
    }
  };

  const { text, color } = getStatusInfo();

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: colors.text,
  },
});
