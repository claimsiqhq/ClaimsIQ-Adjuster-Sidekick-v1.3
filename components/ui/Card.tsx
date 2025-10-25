// Reusable Card component for consistent containers

import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export default function Card({
  children,
  onPress,
  variant = 'default',
  padding = 'cardPadding',
  style,
}: CardProps) {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.line,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        };
      case 'elevated':
        return {
          backgroundColor: colors.white,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        };
    }
  };

  const content = (
    <View
      style={[
        styles.container,
        getVariantStyles(),
        { padding: spacing[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
