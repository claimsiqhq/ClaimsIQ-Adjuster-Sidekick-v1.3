// Search bar component for filtering lists

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fontSizes } from '@/theme/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <Ionicons name="search" size={20} color={colors.textLight} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={colors.textLight} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  containerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
