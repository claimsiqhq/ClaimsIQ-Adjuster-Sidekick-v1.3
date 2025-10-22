// services/weather.ts
// Weatherbit.io API integration

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
const WEATHER_API_BASE = 'https://api.weatherbit.io/v2.0';

export interface Weather {
  temperature: number;
  condition: string;
  icon: string;
  windSpeed: number;
  humidity: number;
  feelsLike: number;
  location?: string;  // City, State/Country
  units?: 'metric' | 'imperial';
}

export interface WeatherAlert {
  headline: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  description: string;
  expires: string;
}

export interface Forecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipChance: number;
}

/**
 * Get current weather for a location using Weatherbit.io
 */
export async function getWeather(lat: number, lon: number): Promise<Weather | null> {
  if (!WEATHER_API_KEY) {
    console.warn('Weather API key not configured');
    return null;
  }

  try {
    // Get units preference from AsyncStorage
    const storedUnits = await AsyncStorage.getItem('settings_units');
    const units = storedUnits === 'metric' ? 'metric' : 'imperial';
    
    const response = await fetch(
      `${WEATHER_API_BASE}/current?lat=${lat}&lon=${lon}&key=${WEATHER_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return null;
    }

    const data = result.data[0];
    
    // Convert based on units preference
    const temperature = units === 'imperial' 
      ? data.temp * 1.8 + 32  // Convert C to F
      : data.temp;  // Keep as Celsius
      
    const windSpeed = units === 'imperial'
      ? data.wind_spd * 2.237  // Convert m/s to mph
      : data.wind_spd * 3.6;  // Convert m/s to km/h
      
    const feelsLike = units === 'imperial'
      ? data.app_temp * 1.8 + 32  // Convert C to F
      : data.app_temp;  // Keep as Celsius
    
    // Build location string from city and country/state
    const location = `${data.city_name}${data.state_code ? `, ${data.state_code}` : ''}${data.country_code ? `, ${data.country_code}` : ''}`;
    
    return {
      temperature,
      condition: data.weather.description,
      icon: data.weather.icon,
      windSpeed,
      humidity: data.rh,
      feelsLike,
      location,
      units,
    };
  } catch (error: any) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

/**
 * Get historical weather for a specific date using Weatherbit.io
 */
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: string  // YYYY-MM-DD format
): Promise<Weather | null> {
  if (!WEATHER_API_KEY) {
    console.warn('Weather API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${WEATHER_API_BASE}/history/daily?lat=${lat}&lon=${lon}&start_date=${date}&end_date=${date}&key=${WEATHER_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Historical weather request failed');
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return null;
    }

    const data = result.data[0];
    
    return {
      temperature: data.temp * 1.8 + 32,
      condition: data.weather.description,
      icon: data.weather.icon,
      windSpeed: data.wind_spd * 2.237,
      humidity: data.rh,
      feelsLike: data.temp * 1.8 + 32, // Historical doesn't have app_temp, use temp
    };
  } catch (error: any) {
    console.error('Historical weather error:', error);
    return null;
  }
}

/**
 * Get weather alerts for a location
 */
export async function getWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  if (!WEATHER_API_KEY) return [];

  try {
    const response = await fetch(
      `${WEATHER_API_BASE}/alerts?lat=${lat}&lon=${lon}&key=${WEATHER_API_KEY}`
    );

    if (!response.ok) return [];

    const result = await response.json();
    const alerts = result.alerts || [];

    return alerts.map((alert: any) => ({
      headline: alert.title,
      severity: mapSeverity(alert.severity),
      description: alert.description,
      expires: alert.expires_utc,
    }));
  } catch (error) {
    console.error('Weather alerts error:', error);
    return [];
  }
}

/**
 * Get multi-day forecast
 */
export async function getWeatherForecast(lat: number, lon: number, days: number = 3): Promise<Forecast[]> {
  if (!WEATHER_API_KEY) return [];

  try {
    const response = await fetch(
      `${WEATHER_API_BASE}/forecast/daily?lat=${lat}&lon=${lon}&days=${days}&key=${WEATHER_API_KEY}`
    );

    if (!response.ok) return [];

    const result = await response.json();
    const forecastDays = result.data || [];

    return forecastDays.map((day: any) => ({
      date: day.valid_date,
      high: day.high_temp * 1.8 + 32,
      low: day.low_temp * 1.8 + 32,
      condition: day.weather.description,
      precipChance: day.pop, // Probability of precipitation
    }));
  } catch (error) {
    console.error('Forecast error:', error);
    return [];
  }
}

function mapSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
  const s = severity.toLowerCase();
  if (s.includes('extreme') || s.includes('red')) return 'extreme';
  if (s.includes('severe') || s.includes('orange')) return 'severe';
  if (s.includes('moderate') || s.includes('yellow')) return 'moderate';
  return 'minor';
}

/**
 * Check if weather is suitable for roof inspections
 */
export function isSafeForRoofInspection(weather: Weather): { safe: boolean; reason?: string } {
  if (weather.windSpeed > 25) {
    return { safe: false, reason: 'High winds (>25mph) - unsafe for roof work' };
  }
  if (weather.condition.toLowerCase().includes('rain')) {
    return { safe: false, reason: 'Rain conditions - slippery roof surface' };
  }
  if (weather.condition.toLowerCase().includes('snow') || weather.condition.toLowerCase().includes('ice')) {
    return { safe: false, reason: 'Snow/ice conditions - dangerous' };
  }
  return { safe: true };
}
