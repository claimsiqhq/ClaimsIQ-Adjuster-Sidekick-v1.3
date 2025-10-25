// Reusable Button component with consistent styling

import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { textStyles } from '@/theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
}: ButtonProps) {
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: colors.primary },
          text: { color: colors.white },
        };
      case 'secondary':
        return {
          container: { backgroundColor: colors.secondary },
          text: { color: colors.white },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.primary,
          },
          text: { color: colors.primary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: colors.primary },
        };
      case 'danger':
        return {
          container: { backgroundColor: colors.error },
          text: { color: colors.white },
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'small':
        return {
          container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
          text: textStyles.buttonSmall,
          iconSize: 16,
        };
      case 'medium':
        return {
          container: { paddingVertical: spacing.buttonPadding, paddingHorizontal: spacing.xl },
          text: textStyles.button,
          iconSize: 20,
        };
      case 'large':
        return {
          container: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl },
          text: { ...textStyles.button, fontSize: 18 },
          iconSize: 24,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={sizeStyles.iconSize}
              color={variantStyles.text.color}
              style={styles.iconLeft}
            />
          )}
          <Text style={[sizeStyles.text, variantStyles.text]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={sizeStyles.iconSize}
              color={variantStyles.text.color}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
