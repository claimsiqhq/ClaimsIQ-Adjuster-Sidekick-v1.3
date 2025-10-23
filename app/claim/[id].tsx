import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { getClaimById, Claim as ClaimRecord } from '@/services/claims';
import { getMediaForClaim } from '@/services/media';
import { supabase } from '@/utils/supabase'; // Import the supabase client
import { colors } from '@/theme/colors';
import { useClaimStore } from '@/store/useClaimStore';
import { handleAppError } from '@/utils/errors';
import { getHistoricalWeather, Weather } from '@/services/weather';
import { geocodeAddress } from '@/services/location';

import WorkflowChecklist from '@/components/WorkflowChecklist';

// Define types for better code clarity
type Claim = ClaimRecord & {
  loss_date?: string;
  loss_location?: string;
  insured_name?: string;
  carrier_name?: string;
  cause_of_loss?: string;
};
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
  }, [id, setActiveClaimId]);

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

  const metadata = claim.metadata || {};
  const lossDetails = metadata.lossDetails || {};
  const policyDetails = metadata.policyDetails || {};
  const policyHolder = metadata.policyHolder || {};
  const adjustor = metadata.adjustor || {};

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Claim ${claim.claim_number}` }} />
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>{claim.claim_number}</Text>
          <Text style={styles.subtitle}>
            Policy: {claim.policy_number || policyDetails.policyNumber || 'N/A'}
          </Text>

          {policyDetails.claimNumber && policyDetails.claimNumber !== claim.claim_number && (
            <Text style={styles.subValue}>FNOL Claim #: {policyDetails.claimNumber}</Text>
          )}

          {/* Display key extracted FNOL data if available */}
          {(Object.keys(metadata).length > 0 || claim.insured_name) && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Insured:</Text>
                <Text style={styles.value}>
                  {policyHolder.insuredName || claim.insured_name || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Carrier:</Text>
                <Text style={styles.value}>
                  {metadata.carrierName || claim.carrier_name || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Loss Type:</Text>
                <Text style={styles.value}>
                  {lossDetails.causeOfLoss || claim.cause_of_loss || 'Property Damage'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Loss Date:</Text>
                <Text style={styles.value}>
                  {lossDetails.dateOfLoss || claim.loss_date || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Location:</Text>
                <Text style={styles.value}>
                  {lossDetails.lossLocation || claim.loss_location || 'N/A'}
                </Text>
              </View>

              {lossDetails.lossDescription && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.label}>Description:</Text>
                  <Text style={styles.description}>
                    {lossDetails.lossDescription}
                  </Text>
                </View>
              )}

              {(adjustor.adjustorAssigned || adjustor.adjustorEmail || adjustor.adjustorPhoneNumber) && (
                <View style={styles.adjustorBox}>
                  <Text style={styles.sectionLabel}>Adjuster Information</Text>
                  <Text style={styles.value}>
                    {adjustor.adjustorAssigned || 'Not assigned'}
                  </Text>
                  {adjustor.adjustorEmail && (
                    <Text style={styles.subValue}>{adjustor.adjustorEmail}</Text>
                  )}
                  {adjustor.adjustorPhoneNumber && (
                    <Text style={styles.subValue}>{adjustor.adjustorPhoneNumber}</Text>
                  )}
                </View>
              )}
            </>
          )}
          
          {lossWeather && (
            <View style={styles.weatherBanner}>
              <Text style={styles.weatherLabel}>Weather on Date of Loss:</Text>
              <Text style={styles.weatherValue}>
                {Math.round(lossWeather.temperature)}°F • {lossWeather.condition} • Wind: {Math.round(lossWeather.windSpeed)} mph
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.galleryHeader}>Gallery</Text>
        
        {media.length === 0 ? (
          <Text style={styles.emptyText}>No media found for this claim.</Text>
        ) : (
          <View style={styles.mediaGrid}>
            {media.map((item) => (
              <Pressable 
                key={item.id}
                style={styles.mediaItem} 
                onPress={() => router.push(`/photo/${item.id}`)}
              >
                {/* Simple visual indicator for annotation status */}
                {item.status === 'pending' && (
                  <View style={styles.pendingIndicator}>
                    <ActivityIndicator size="small" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.workflowSection}>
          <Text style={styles.workflowHeaderTitle}>Inspection Workflow</Text>
          <WorkflowChecklist
            claimId={claim.id}
            onWorkflowComplete={() => {
              Alert.alert('Workflow Complete', 'All steps for this claim are complete.');
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  container: { 
    flex: 1, 
    backgroundColor: colors.bgSoft 
  },
  header: { 
    padding: 20, 
    backgroundColor: colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: colors.text 
  },
  subtitle: { 
    fontSize: 16, 
    color: colors.textSoft, 
    marginTop: 4,
    marginBottom: 16
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    width: 100,
  },
  value: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  subValue: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  descriptionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.bgSoft,
    borderRadius: 8,
  },
  description: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    lineHeight: 18,
  },
  adjustorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  galleryHeader: { 
    fontSize: 18, 
    fontWeight: '600', 
    padding: 20, 
    color: colors.text 
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 1,
  },
  mediaItem: {
    width: '33.33%',
    aspectRatio: 1,
    backgroundColor: '#ccc',
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 20, 
    color: colors.textSoft 
  },
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
  workflowSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  workflowHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});
