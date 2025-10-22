import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getClaims } from '@/services/claims';
import { useAuth } from '@/hooks/useAuth';
import { useClaimStore } from '@/store/useClaimStore';
import { colors } from '@/theme/colors';
import { handleAppError } from '@/utils/errors';

type Claim = {
  id: string;
  claim_number: string;
  policy_number: string;
};

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
    <View style={styles.container}>
      <FlatList
        data={claims}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.itemContainer} onPress={() => handleSelectClaim(item.id)}>
            <Text style={styles.itemTitle}>{item.claim_number}</Text>
            <Text style={styles.itemSubtitle}>Policy: {item.policy_number}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No claims found</Text>
            <Text style={styles.emptySubtext}>
              Upload an FNOL PDF document to create your first claim.
              {'\n\n'}Go to Capture → Document to get started.
            </Text>
            <Pressable 
              style={styles.uploadButton}
              onPress={() => router.push('/document/upload')}
            >
              <Text style={styles.uploadButtonText}>Upload FNOL Document</Text>
            </Pressable>
          </View>
        }
      />
    </View>
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
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: colors.textSoft,
  }
});