import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getClaims, Claim } from '@/services/claims';
import { useAuth } from '@/hooks/useAuth';
import { useClaimStore } from '@/store/useClaimStore';
import { colors } from '@/theme/colors';
import { handleAppError } from '@/utils/errors';

export default function ClaimsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { setActiveClaimId } = useClaimStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      const fetchClaims = async () => {
        try {
          setLoading(true);
          setError(null);
          console.log('Fetching claims for user:', session.user.id);
          const userClaims = await getClaims(session.user.id);
          console.log(`Found ${userClaims?.length || 0} claims`);
          setClaims(userClaims || []);
        } catch (error: any) {
          console.error('Claims fetch error:', error);
          setError(error?.message || 'Failed to fetch claims');
          handleAppError(error, "Failed to fetch claims.");
          setClaims([]);
        } finally {
          setLoading(false);
        }
      };
      fetchClaims();
    } else {
      setLoading(false);
      setClaims([]);
    }
  }, [session]);

  const handleSelectClaim = (claimId: string) => {
    setActiveClaimId(claimId); // Set the active claim in the global store
    router.push(`/claim/${claimId}`);
  };

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Claims</Text>
        <Pressable 
          style={styles.headerButton}
          onPress={() => router.push('/document/upload')}
        >
          <Text style={styles.headerButtonText}>+ Upload FNOL</Text>
        </Pressable>
      </View>
      <FlatList
        data={claims}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const metadata = item.metadata || {};
          const lossLocation =
            item.loss_location ||
            metadata.lossDetails?.lossLocation ||
            metadata.policyDetails?.propertyAddress ||
            'Location not set';

          const subtitleParts = [lossLocation];
          if (item.status) {
            subtitleParts.push(`Status: ${item.status}`);
          }

          if (metadata.lossDetails?.dateOfLoss || item.loss_date) {
            subtitleParts.push(
              `Loss: ${metadata.lossDetails?.dateOfLoss || item.loss_date}`
            );
          }

          return (
            <Pressable style={styles.itemContainer} onPress={() => handleSelectClaim(item.id)}>
              <Text style={styles.itemTitle}>
                {item.claim_number || metadata.policyDetails?.claimNumber || 'Unnamed Claim'}
              </Text>
              <Text style={styles.itemSubtitle}>{subtitleParts.join(' • ')}</Text>
              {metadata.policyHolder?.insuredName && (
                <Text style={styles.itemMeta}>Insured: {metadata.policyHolder.insuredName}</Text>
              )}
              {item.workflow_metadata?.workflowName && (
                <Text style={styles.itemMeta}>
                  Workflow: {item.workflow_metadata.workflowName}
                </Text>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No claims found</Text>
            <Text style={styles.emptySubtext}>
              Upload an FNOL PDF document to automatically extract claim data
              and generate inspection workflows using AI.
            </Text>
            <Pressable 
              style={styles.uploadButton}
              onPress={() => router.push('/document/upload')}
            >
              <Text style={styles.uploadButtonText}>📄 Upload FNOL PDF</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  itemContainer: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.textSoft,
    marginTop: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: colors.textSoft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontSize: 14,
    color: colors.textSoft,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
});
