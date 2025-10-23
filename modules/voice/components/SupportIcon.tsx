
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionStatus } from '@/modules/voice/types';
import { colors } from '@/theme/colors';

interface SupportIconProps {
  status: SessionStatus;
  onClick: () => void;
}

export const SupportIcon: React.FC<SupportIconProps> = ({ status, onClick }) => {
  const isSessionActive = status !== 'idle' && status !== 'error';

  const getIconName = () => {
    switch (status) {
      case 'listening':
      case 'connecting':
        return 'mic-outline';
      case 'speaking':
        return 'headset-outline';
      case 'idle':
      case 'error':
        return 'mic-outline';
      case 'closing':
      default:
        return 'mic-off-outline';
    }
  };

  const iconColor = isSessionActive ? colors.white : colors.white;
  const backgroundColor = isSessionActive ? colors.error : colors.primary;

  return (
    <Pressable
      onPress={onClick}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={getIconName()} size={48} color={iconColor} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
