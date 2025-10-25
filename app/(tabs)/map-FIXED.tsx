// Fixed Map Screen with React Native Maps
// Install with: npm install react-native-maps
// Then rename this file to map.tsx

import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, SafeAreaView, Platform } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
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
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

  useEffect(() => {
    loadMapData();
  }, []);

  async function loadMapData() {
    try {
      setLoading(true);

      // Get current location
      try {
        const location = await getCurrentLocation();
        const coords = { latitude: location.latitude, longitude: location.longitude };
        setCurrentLocation(coords);

        // Set initial map region to current location
        setMapRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      } catch (error) {
        console.log('Location permission denied or unavailable');
      }

      // Load claims with locations
      const { data, error } = await supabase
        .from('claims')
        .select('id, claim_number, loss_location, status')
        .not('loss_location', 'is', null)
        .in('status', ['open', 'in_progress'])
        .limit(50);  // Increased from 20 for better coverage

      if (error) throw error;

      // Geocode addresses in batches
      const claimsWithCoords: ClaimLocation[] = [];
      const batchSize = 5;

      for (let i = 0; i < (data || []).length; i += batchSize) {
        const batch = (data || []).slice(i, i + batchSize);
        const geocodePromises = batch.map(async (claim) => {
          try {
            const coords = await geocodeAddress(claim.loss_location || '');
            return {
              ...claim,
              coordinates: coords,
            };
          } catch (error) {
            console.log(`Failed to geocode ${claim.loss_location}`);
            return { ...claim, coordinates: null };
          }
        });

        const geocodedBatch = await Promise.all(geocodePromises);
        claimsWithCoords.push(...geocodedBatch);
      }

      const validClaims = claimsWithCoords.filter(c => c.coordinates !== null);
      setClaims(validClaims);

      // If no current location but we have claims, center on first claim
      if (!currentLocation && validClaims.length > 0 && validClaims[0].coordinates) {
        setMapRegion({
          latitude: validClaims[0].coordinates.latitude,
          longitude: validClaims[0].coordinates.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }

    } catch (error: any) {
      console.error('Map data error:', error);
      Alert.alert('Error', 'Failed to load map data: ' + error.message);
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

      // Fit map to show all route points
      if (routeData.stops.length > 0) {
        fitMapToRoute(routeData.stops.map(s => s.coordinates));
      }

      Alert.alert(
        'Route Created',
        `${routeData.stops.length} stops\n${routeData.totalDistance.toFixed(1)} km\n~${Math.floor(routeData.estimatedDuration / 60)}h ${routeData.estimatedDuration % 60}m`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setOptimizing(false);
    }
  }

  function fitMapToRoute(coordinates: Coordinates[]) {
    if (coordinates.length === 0) return;

    const lats = coordinates.map(c => c.latitude);
    const lngs = coordinates.map(c => c.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    setMapRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.3,  // Add padding
      longitudeDelta: (maxLng - minLng) * 1.3,
    });
  }

  function handleMarkerPress(claimId: string) {
    setSelectedClaim(claimId);
  }

  function handleCalloutPress(claimId: string) {
    router.push(`/claim/${claimId}`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  // Fallback region if nothing else is set
  const displayRegion = mapRegion || {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Map & Route" subtitle={`${claims.length} claim locations`} />

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={displayRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          rotateEnabled={false}
        >
          {/* Current location marker */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              pinColor={colors.success}
            >
              <View style={[styles.markerBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="person" size={16} color={colors.white} />
              </View>
            </Marker>
          )}

          {/* Claim markers */}
          {claims.map((claim, index) => {
            if (!claim.coordinates) return null;

            return (
              <Marker
                key={claim.id}
                coordinate={claim.coordinates}
                title={`Claim #${claim.claim_number || 'Unnamed'}`}
                description={claim.loss_location || undefined}
                onPress={() => handleMarkerPress(claim.id)}
                onCalloutPress={() => handleCalloutPress(claim.id)}
              >
                <View style={styles.markerBadge}>
                  <Text style={styles.markerText}>{index + 1}</Text>
                </View>
              </Marker>
            );
          })}

          {/* Route polyline */}
          {route && route.stops.length > 1 && (
            <Polyline
              coordinates={route.stops.map(s => s.coordinates)}
              strokeColor={colors.primary}
              strokeWidth={3}
              lineDashPattern={[1]}
            />
          )}
        </MapView>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <Pressable
            style={styles.controlButton}
            onPress={() => currentLocation && setMapRegion({
              ...displayRegion,
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            })}
          >
            <Ionicons name="locate" size={24} color={colors.primary} />
          </Pressable>

          <Pressable
            style={styles.controlButton}
            onPress={loadMapData}
          >
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.bottomSheet}>
        <Section title={route ? `Route (${route.stops.length} stops)` : "Claims on Map"}>
          {route ? (
            <View style={styles.routeInfo}>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{route.totalDistance.toFixed(1)} km</Text>
                <Text style={styles.routeStatLabel}>Distance</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>
                  {Math.floor(route.estimatedDuration / 60)}h {route.estimatedDuration % 60}m
                </Text>
                <Text style={styles.routeStatLabel}>Duration</Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={styles.routeStatValue}>{route.stops.length}</Text>
                <Text style={styles.routeStatLabel}>Stops</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.infoText}>
              {claims.length} claim{claims.length !== 1 ? 's' : ''} with valid locations
            </Text>
          )}

          {claims.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No claims with locations</Text>
              <Text style={styles.emptySubtext}>
                Upload FNOLs or add claim addresses to see them on the map
              </Text>
            </View>
          )}

          {claims.map((claim, index) => {
            const isSelected = selectedClaim === claim.id;

            return (
              <Pressable
                key={claim.id}
                style={[
                  styles.claimCard,
                  isSelected && styles.claimCardSelected
                ]}
                onPress={() => {
                  setSelectedClaim(claim.id);
                  if (claim.coordinates) {
                    setMapRegion({
                      latitude: claim.coordinates.latitude,
                      longitude: claim.coordinates.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                  }
                }}
              >
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <View style={styles.claimInfo}>
                  <Text style={styles.claimNumber}>
                    Claim #{claim.claim_number || 'Unnamed'}
                  </Text>
                  <Text style={styles.claimAddress} numberOfLines={1}>
                    {claim.loss_location}
                  </Text>
                  {claim.status && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{claim.status}</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textLight}
                />
              </Pressable>
            );
          })}

          <Pressable
            style={[
              styles.createRouteButton,
              (optimizing || claims.length === 0) && styles.buttonDisabled
            ]}
            onPress={handleCreateRoute}
            disabled={optimizing || claims.length === 0}
          >
            {optimizing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.createRouteButtonText}>
                {route ? '🔄 Re-optimize Route' : '📍 Create Optimized Route'}
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textLight,
  },
  mapContainer: {
    height: 350,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  controlButton: {
    backgroundColor: colors.white,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerBadge: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: {
    color: colors.white,
    fontSize: 13,
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
    color: colors.textLight,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
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
  claimCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.light,
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
    color: colors.textLight,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'capitalize',
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
});
