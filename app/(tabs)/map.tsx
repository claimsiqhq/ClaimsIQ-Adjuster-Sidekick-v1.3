import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, SafeAreaView } from "react-native";
// import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';  // Temporarily disabled
import Header from "@/components/Header";
import Section from "@/components/Section";
import { colors } from "@/theme/colors";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { getCurrentLocation, geocodeAddress, Coordinates } from "@/services/location";
import { createDailyRoute, optimizeRoute, calculateETAs, Route as RouteData } from "@/services/routing";

interface ClaimLocation {
  id: string;
  claim_number: string | null;
  loss_location: string | null;
  coordinates: Coordinates | null;
  status: string | null;
}

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadMapData();
  }, []);

  async function loadMapData() {
    try {
      setLoading(true);

      // Get current location
      try {
        const location = await getCurrentLocation();
        setCurrentLocation({ latitude: location.latitude, longitude: location.longitude });
      } catch (error) {
        console.log('Location permission denied or unavailable');
      }

      // Check if Supabase is configured
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_API_KEY) {
        console.error('Supabase not configured - cannot load claims');
        setClaims([]);
        return;
      }

      // Load claims with locations
      const { data, error } = await supabase
        .from('claims')
        .select('id, claim_number, loss_location, status')
        .not('loss_location', 'is', null)
        .in('status', ['open', 'in_progress'])
        .limit(20);

      if (error) throw error;

      // Geocode addresses
      const claimsWithCoords: ClaimLocation[] = [];
      for (const claim of data || []) {
        const coords = await geocodeAddress(claim.loss_location || '');
        claimsWithCoords.push({
          ...claim,
          coordinates: coords,
        });
      }

      setClaims(claimsWithCoords.filter(c => c.coordinates !== null));
    } catch (error: any) {
      console.error('Map data error:', error);
      // If it's a Supabase configuration error, just set empty claims
      if (error?.message?.includes('Supabase is not configured')) {
        setClaims([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoute() {
    if (claims.length === 0) {
      Alert.alert('No Claims', 'No claims with addresses found.');
      return;
    }

    try {
      setOptimizing(true);
      const claimIds = claims.map(c => c.id);
      const routeData = await createDailyRoute(claimIds);
      
      // Optimize if we have current location
      if (currentLocation) {
        const optimizedStops = await optimizeRoute(routeData.stops, currentLocation);
        routeData.stops = optimizedStops;
        routeData.optimized = true;
      }

      setRoute(routeData);
      Alert.alert(
        'Route Created',
        `${routeData.stops.length} stops\n${routeData.totalDistance.toFixed(1)} km\n~${routeData.estimatedDuration} minutes`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setOptimizing(false);
    }
  }

  const initialRegion = currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : claims.length > 0 && claims[0].coordinates ? {
    latitude: claims[0].coordinates.latitude,
    longitude: claims[0].coordinates.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Map & Route" subtitle="Claims locations and routing" />
      
      <View style={styles.mapContainer}>
        <View style={[styles.map, { backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 12 }}>Map View</Text>
          <Text style={{ color: colors.textLight, marginTop: 4 }}>
            {claims.length} claim locations
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
            MapView temporarily disabled to fix build errors
          </Text>
        </View>
      </View>

      <ScrollView style={styles.bottomSheet}>
        <Section title={route ? `Route (${route.stops.length} stops)` : "Today's Claims"}>
          {!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_API_KEY ? (
            <View style={styles.configWarning}>
              <Text style={styles.configWarningText}>⚠️ Supabase not configured</Text>
              <Text style={styles.configWarningSubtext}>
                Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_API_KEY to your .env file to enable claims mapping
              </Text>
            </View>
          ) : route ? (
            <View style={styles.routeInfo}>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{route.totalDistance.toFixed(1)} km</Text>
                <Text style={styles.routeStatLabel}>Distance</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{Math.floor(route.estimatedDuration / 60)}h {route.estimatedDuration % 60}m</Text>
                <Text style={styles.routeStatLabel}>Duration</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{route.stops.length}</Text>
                <Text style={styles.routeStatLabel}>Stops</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.infoText}>
              {claims.length} claim{claims.length !== 1 ? 's' : ''} with locations
            </Text>
          )}

          {claims.map((claim, index) => (
            <Pressable
              key={claim.id}
              style={styles.claimCard}
              onPress={() => router.push(`/claim/${claim.id}`)}
            >
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
              </View>
              <View style={styles.claimInfo}>
                <Text style={styles.claimNumber}>Claim #{claim.claim_number || 'Unnamed'}</Text>
                <Text style={styles.claimAddress} numberOfLines={1}>{claim.loss_location}</Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            style={[styles.createRouteButton, optimizing && styles.buttonDisabled]}
            onPress={handleCreateRoute}
            disabled={optimizing || claims.length === 0}
          >
            {optimizing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.createRouteButtonText}>
                {route ? '🔄 Optimize Route' : '📍 Create Route'}
              </Text>
            )}
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  map: {
    flex: 1,
  },
  markerBadge: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  markerText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSheet: {
    flex: 1,
  },
  routeInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  routeStat: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  routeStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  routeStatLabel: {
    fontSize: 11,
    color: '#5F6771',
  },
  infoText: {
    fontSize: 14,
    color: '#5F6771',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  claimInfo: {
    flex: 1,
  },
  claimNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  claimAddress: {
    fontSize: 12,
    color: '#5F6771',
  },
  createRouteButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  createRouteButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  configWarning: {
    backgroundColor: '#FFF5F5',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  configWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C53030',
    marginBottom: 4,
  },
  configWarningSubtext: {
    fontSize: 12,
    color: '#742A2A',
  },
});
