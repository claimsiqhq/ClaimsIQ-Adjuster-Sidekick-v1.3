import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { getOrCreateClaimByNumber } from '@/services/claims';
import { getSession } from '@/services/auth';

export default function NewClaimScreen() {
  const router = useRouter();
  const [claimNumber, setClaimNumber] = useState('');
  const [address, setAddress] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [lossDate, setLossDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!claimNumber.trim()) {
      Alert.alert('Required', 'Please enter a claim number');
      return;
    }

    try {
      setSaving(true);
      
      // Get user session
      const session = await getSession();
      if (!session?.user?.id) {
        Alert.alert('Error', 'Please log in again');
        router.replace('/auth/login');
        return;
      }

      // Create or get claim
      const claim = await getOrCreateClaimByNumber(claimNumber.trim());
      
      // Navigate to the claim detail
      router.replace(`/claim/${claim.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create claim');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Claim</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>Enter claim information to get started</Text>
          
          {/* Required Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Claim Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="CLM-2025-001234"
              value={claimNumber}
              onChangeText={setClaimNumber}
              autoCapitalize="characters"
            />
          </View>

          {/* Optional Fields */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Insured Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              value={insuredName}
              onChangeText={setInsuredName}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Policy Number</Text>
            <TextInput
              style={styles.input}
              placeholder="POL-123456"
              value={policyNumber}
              onChangeText={setPolicyNumber}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Loss Date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/DD/YYYY"
              value={lossDate}
              onChangeText={setLossDate}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Loss Address</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St, City, State ZIP"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief description of the loss..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.tipContainer}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              You can also upload an FNOL PDF from the Claims tab to automatically extract all claim details
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Creating...' : 'Create Claim'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.light,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.core,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.core,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.core,
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryButtonText: {
    color: colors.core,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});