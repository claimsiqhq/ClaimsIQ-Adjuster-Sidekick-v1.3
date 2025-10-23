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
 * Prompts the user to grant foreground location permissions for the app.
 * This is a necessary step before accessing any location-based services.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if permission is granted, `false` otherwise.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Retrieves the device's current geographical location one time.
 * This function first ensures that location permissions have been granted. It then requests the
 * current position with high accuracy.
 *
 * @returns {Promise<LocationData>} A promise that resolves to a `LocationData` object containing
 *          the coordinates and other details of the current location.
 * @throws {Error} Throws an error if location permission is denied.
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
 * Converts a human-readable street address into geographic coordinates (latitude and longitude).
 * This process is also known as geocoding.
 *
 * @param {string} address - The street address to geocode.
 * @returns {Promise<Coordinates | null>} A promise that resolves to a `Coordinates` object,
 *          or `null` if the address could not be found.
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
 * Converts geographic coordinates into a human-readable street address.
 * This process is also known as reverse geocoding.
 *
 * @param {Coordinates} coords - The latitude and longitude to look up.
 * @returns {Promise<string | null>} A promise that resolves to a formatted address string,
 *          or `null` if no address could be found for the given coordinates.
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
 * Calculates the distance between two geographical points using the Haversine formula.
 *
 * @param {Coordinates} from - The starting point coordinates.
 * @param {Coordinates} to - The destination point coordinates.
 * @returns {number} The distance between the two points in kilometers.
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

/**
 * Converts degrees to radians.
 * @param {number} degrees - The angle in degrees.
 * @returns {number} The angle in radians.
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Sets up a subscription to receive continuous updates of the device's location.
 * This is useful for tracking movement in real-time. The callback function provided will be
 * invoked whenever a new location is available, based on the specified accuracy, distance,
 * and time intervals.
 *
 * @param {(location: LocationData) => void} callback - A function that will be called with
 *        the new `LocationData` object each time the location is updated.
 * @returns {Promise<() => void>} A promise that resolves to a function that, when called,
 *          will unsubscribe from the location updates and stop the listener.
 * @throws {Error} Throws an error if location permission is denied.
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


