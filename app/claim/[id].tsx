import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { getClaimById } from '@/services/claims';
import { getMediaForClaim } from '@/services/media';
import { supabase } from '@/utils/supabase'; // Import the supabase client
import { colors } from '@/theme/colors';
import { useClaimStore } from '@/store/useClaimStore';
import { handleAppError } from '@/utils/errors';
import { getHistoricalWeather, Weather } from '@/services/weather';
import { geocodeAddress } from '@/services/location';

// Define types for better code clarity
type Claim = { id: string; claim_number: string; policy_number: string; };
type Media = { id: string; public_url: string; status: 'pending' | 'annotated' | 'failed' };

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [lossWeather, setLossWeather] = useState<Weather | null>(null);
  const { setActiveClaimId } = useClaimStore();

  useEffect(() => {
    if (typeof id !== 'string') return;
    
    // Set this claim as active in the global store when the screen is visited.
    setActiveClaimId(id);

    // Initial data fetch
    const fetchData = async () => {
      try {
        setLoading(true);
        const claimDetails = await getClaimById(id);
        const mediaItems = await getMediaForClaim(id);
        setClaim(claimDetails);
        setMedia(mediaItems || []);

        // Load historical weather if loss_date and location available
        if (claimDetails?.loss_date && claimDetails?.loss_location) {
          try {
            const coords = await geocodeAddress(claimDetails.loss_location);
            if (coords) {
              const lossDate = new Date(claimDetails.loss_date).toISOString().split('T')[0];
              const weather = await getHistoricalWeather(
                coords.latitude,
                coords.longitude,
                lossDate
              );
              setLossWeather(weather);
            }
          } catch (error) {
            console.log('Historical weather unavailable:', error);
          }
        }
      } catch (error) {
        handleAppError(error, 'Failed to load claim details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // --- REAL-TIME SUBSCRIPTION ---
    const mediaSubscription = supabase
      .channel(`media-for-claim-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media', filter: `claim_id=eq.${id}` },
        (payload) => {
          console.log('Real-time media update received:', payload);
          // Re-fetch the media list to ensure the UI is in sync with the database.
          getMediaForClaim(id).then(updatedMedia => setMedia(updatedMedia || []));
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts
    return () => {
      supabase.removeChannel(mediaSubscription);
      setActiveClaimId(null); // Clear active claim when leaving the screen
    };
  }, [id]);

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  if (!claim) {
    return (
      <View style={styles.centered}>
        <Text>Claim not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Claim ${claim.claim_number}` }} />
      <View style={styles.header}>
        <Text style={styles.title}>{claim.claim_number}</Text>
        <Text style={styles.subtitle}>Policy: {claim.policy_number}</Text>
        
        {lossWeather && (
          <View style={styles.weatherBanner}>
            <Text style={styles.weatherLabel}>Weather on Date of Loss:</Text>
            <Text style={styles.weatherValue}>
              {Math.round(lossWeather.temperature)}°F • {lossWeather.condition} • Wind: {Math.round(lossWeather.windSpeed)} mph
            </Text>
          </View>
        )}
      </View>
      <FlatList
        data={media}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <Pressable style={styles.mediaItem} onPress={() => router.push(`/photo/${item.id}`)}>
             {/* Simple visual indicator for annotation status */}
            {item.status === 'pending' && <View style={styles.pendingIndicator}><ActivityIndicator size="small" /></View>}
          </Pressable>
        )}
        ListHeaderComponent={<Text style={styles.galleryHeader}>Gallery</Text>}
        ListEmptyComponent={<Text style={styles.emptyText}>No media found for this claim.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: colors.bgSoft },
    header: { padding: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 16, color: colors.textSoft, marginTop: 4 },
    galleryHeader: { fontSize: 18, fontWeight: '600', padding: 20, color: colors.text },
    mediaItem: {
        flex: 1 / 3,
        aspectRatio: 1,
        backgroundColor: '#ccc',
        margin: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingIndicator: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: { textAlign: 'center', marginTop: 20, color: colors.textSoft },
  weatherBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  weatherLabel: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  weatherValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});