// services/location.ts
// GPS and location services

import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData extends Coordinates {
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get current device location
 */
export async function getCurrentLocation(): Promise<LocationData> {
  const hasPermission = await requestLocationPermission();
  
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy || 0,
    altitude: location.coords.altitude,
    heading: location.coords.heading,
    speed: location.coords.speed,
  };
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const results = await Location.geocodeAsync(address);
    
    if (results.length === 0) {
      return null;
    }

    return {
      latitude: results[0].latitude,
      longitude: results[0].longitude,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    
    if (results.length === 0) {
      return null;
    }

    const address = results[0];
    const parts = [
      address.streetNumber,
      address.street,
      address.city,
      address.region,
      address.postalCode,
    ].filter(Boolean);

    return parts.join(', ');
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two points (in kilometers)
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
    Math.cos(toRad(to.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Watch position with continuous updates
 */
export async function watchPosition(
  callback: (location: LocationData) => void
): Promise<() => void> {
  const hasPermission = await requestLocationPermission();
  
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // Update every 10 meters
      timeInterval: 5000, // Or every 5 seconds
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
      });
    }
  );

  return () => subscription.remove();
}


