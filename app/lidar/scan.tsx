// app/lidar/scan.tsx - LiDAR temporarily disabled
import { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function LiDARScanScreen() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  const router = useRouter();

  useEffect(() => {
    // Show message that LiDAR is disabled
    Alert.alert(
      'LiDAR Temporarily Disabled',
      'LiDAR scanning functionality is currently disabled. This feature will be available in a future update.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>LiDAR Scanner</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.message}>LiDAR Scanning</Text>
          <Text style={styles.submessage}>Coming Soon</Text>
          <Text style={styles.description}>
            This feature is temporarily disabled and will be available in a future update.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageContainer: {
    alignItems: 'center',
    padding: 32,
  },
  message: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  submessage: {
    fontSize: 18,
    color: colors.primary,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});