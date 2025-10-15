// services/routing.ts
// Route optimization and ETA calculations

import { Coordinates, calculateDistance, geocodeAddress } from './location';
import { supabase } from '@/utils/supabase';

export interface Stop {
  id: string;
  claimId: string;
  address: string;
  coordinates: Coordinates | null;
  arrivalTime?: Date;
  departureTime?: Date;
  order: number;
}

export interface Route {
  id: string;
  date: string;
  stops: Stop[];
  totalDistance: number; // in km
  estimatedDuration: number; // in minutes
  optimized: boolean;
}

export interface ETA {
  stopId: string;
  estimatedArrival: Date;
  durationFromPrevious: number; // minutes
  distanceFromPrevious: number; // km
}

/**
 * Create a daily route from claim IDs
 */
export async function createDailyRoute(claimIds: string[]): Promise<Route> {
  const stops: Stop[] = [];

  // Get claim details and geocode addresses
  for (let i = 0; i < claimIds.length; i++) {
    const { data: claim } = await supabase
      .from('claims')
      .select('id, claim_number, loss_location, property_address')
      .eq('id', claimIds[i])
      .single();

    if (!claim) continue;

    const address = claim.loss_location || 
                   (claim.property_address as any)?.address || 
                   'Unknown';
    
    const coordinates = await geocodeAddress(address);

    stops.push({
      id: `stop_${i}`,
      claimId: claim.id,
      address,
      coordinates,
      order: i,
    });
  }

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i].coordinates;
    const to = stops[i + 1].coordinates;
    if (from && to) {
      totalDistance += calculateDistance(from, to);
    }
  }

  // Estimate duration (assuming 40 km/h average + 30 min per stop)
  const drivingTime = (totalDistance / 40) * 60; // Convert to minutes
  const stopTime = stops.length * 30; // 30 minutes per stop
  const estimatedDuration = Math.round(drivingTime + stopTime);

  return {
    id: `route_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    stops,
    totalDistance,
    estimatedDuration,
    optimized: false,
  };
}

/**
 * Optimize route order using nearest-neighbor algorithm
 */
export async function optimizeRoute(stops: Stop[], startLocation: Coordinates): Promise<Stop[]> {
  if (stops.length <= 2) return stops;

  const optimized: Stop[] = [];
  const remaining = [...stops];
  let current = startLocation;

  // Nearest neighbor algorithm
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      if (!stop.coordinates) continue;

      const distance = calculateDistance(current, stop.coordinates);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0];
    nearest.order = optimized.length;
    optimized.push(nearest);
    
    if (nearest.coordinates) {
      current = nearest.coordinates;
    }
  }

  return optimized;
}

/**
 * Calculate ETAs for each stop in route
 */
export async function calculateETAs(
  route: Route,
  startTime: Date = new Date()
): Promise<ETA[]> {
  const etas: ETA[] = [];
  let currentTime = startTime;

  for (let i = 0; i < route.stops.length; i++) {
    const stop = route.stops[i];
    const prevStop = i > 0 ? route.stops[i - 1] : null;

    let durationFromPrevious = 0;
    let distanceFromPrevious = 0;

    if (prevStop && prevStop.coordinates && stop.coordinates) {
      distanceFromPrevious = calculateDistance(prevStop.coordinates, stop.coordinates);
      // Assume 40 km/h average speed
      durationFromPrevious = (distanceFromPrevious / 40) * 60; // in minutes
    }

    currentTime = new Date(currentTime.getTime() + durationFromPrevious * 60 * 1000);

    etas.push({
      stopId: stop.id,
      estimatedArrival: currentTime,
      durationFromPrevious,
      distanceFromPrevious,
    });

    // Add stop duration (30 minutes per stop)
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }

  return etas;
}

/**
 * Get traffic data (placeholder for Google Maps API integration)
 */
export async function getTrafficData(coordinates: Coordinates): Promise<any> {
  // TODO: Integrate with Google Maps Traffic API
  // For now, return mock data
  return {
    level: 'moderate',
    delay: 0,
  };
}

/**
 * Save route to database
 */
export async function saveRoute(route: Route): Promise<string> {
  const { data, error } = await supabase
    .from('routes')
    .insert({
      date: route.date,
      optimized_order: route.stops.map(s => s.claimId),
      total_distance_km: route.totalDistance,
      estimated_duration_minutes: route.estimatedDuration,
      metadata: { stops: route.stops },
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

