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
  windDirection: string;  // Cardinal direction
  windGust?: number;
  humidity: number;
  feelsLike: number;
  location?: string;  // City, State/Country
  units?: 'metric' | 'imperial';
  // Additional rich data
  uvIndex?: number;
  visibility?: number;
  pressure?: number;
  seaLevelPressure?: number;
  cloudCoverage?: number;
  precipitation?: number;
  snow?: number;
  dewPoint?: number;
  airQualityIndex?: number;
  sunrise?: string;
  sunset?: string;
  partOfDay?: 'day' | 'night';
  observationTime?: string;
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
 * Fetches the current weather conditions for a given latitude and longitude from the Weatherbit.io API.
 * It respects the user's preferred units (metric or imperial) and enriches the data with additional
 * useful information like UV index, visibility, and air quality.
 *
 * @param {number} lat - The latitude of the location.
 * @param {number} lon - The longitude of the location.
 * @returns {Promise<Weather | null>} A promise that resolves to a `Weather` object, or `null` if the
 *          API key is not configured or an error occurs.
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

    const response = await fetch(`${WEATHER_API_BASE}/current?lat=${lat}&lon=${lon}&key=${WEATHER_API_KEY}`);

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const result = await response.json();

    if (!result.data || result.data.length === 0) {
      return null;
    }

    const data = result.data[0];

    // Convert based on units preference
    const temperature = units === 'imperial' ? data.temp * 1.8 + 32 : // Convert C to F
      data.temp; // Keep as Celsius

    const windSpeed = units === 'imperial' ? data.wind_spd * 2.237 : // Convert m/s to mph
      data.wind_spd * 3.6; // Convert m/s to km/h

    const feelsLike = units === 'imperial' ? data.app_temp * 1.8 + 32 : // Convert C to F
      data.app_temp; // Keep as Celsius

    // Build location string from city and country/state
    const location = `${data.city_name}${data.state_code ? `, ${data.state_code}` : ''}${
      data.country_code ? `, ${data.country_code}` : ''
    }`;

    // Convert additional units
    const visibility = units === 'imperial' ? data.vis * 0.621371 : // Convert km to miles
      data.vis; // Keep as km

    const dewPoint = units === 'imperial' ? data.dewpt * 1.8 + 32 : // Convert C to F
      data.dewpt; // Keep as Celsius

    const windGust = data.gust ? units === 'imperial' ? data.gust * 2.237 : // Convert m/s to mph
      data.gust * 3.6 : undefined; // Convert m/s to km/h

    return {
      temperature,
      condition: data.weather.description,
      icon: data.weather.icon,
      windSpeed,
      windDirection: data.wind_cdir_full || data.wind_cdir,
      windGust,
      humidity: data.rh,
      feelsLike,
      location,
      units,
      // Additional rich data
      uvIndex: data.uv,
      visibility,
      pressure: data.pres,
      seaLevelPressure: data.slp,
      cloudCoverage: data.clouds,
      precipitation: data.precip,
      snow: data.snow,
      dewPoint,
      airQualityIndex: data.aqi,
      sunrise: data.sunrise,
      sunset: data.sunset,
      partOfDay: data.pod === 'd' ? 'day' : 'night',
      observationTime: data.ob_time,
    };
  } catch (error: any) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

/**
 * Retrieves historical weather data for a specific date and location.
 *
 * @param {number} lat - The latitude of the location.
 * @param {number} lon - The longitude of the location.
 * @param {string} date - The date for which to fetch historical weather, in 'YYYY-MM-DD' format.
 * @returns {Promise<Weather | null>} A promise that resolves to a `Weather` object with the historical data.
 */
export async function getHistoricalWeather(
  lat: number,
  lon: number,
  date: string // YYYY-MM-DD format
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
 * Fetches active weather alerts for a given location.
 *
 * @param {number} lat - The latitude of the location.
 * @param {number} lon - The longitude of the location.
 * @returns {Promise<WeatherAlert[]>} A promise that resolves to an array of `WeatherAlert` objects.
 */
export async function getWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  if (!WEATHER_API_KEY) return [];

  try {
    const response = await fetch(`${WEATHER_API_BASE}/alerts?lat=${lat}&lon=${lon}&key=${WEATHER_API_KEY}`);

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
 * Retrieves a multi-day weather forecast for a given location.
 *
 * @param {number} lat - The latitude of the location.
 * @param {number} lon - The longitude of the location.
 * @param {number} [days=3] - The number of days to forecast.
 * @returns {Promise<Forecast[]>} A promise that resolves to an array of `Forecast` objects.
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

/**
 * Maps the severity string from the weather API to a standardized severity level.
 * @param {string} severity - The severity string from the API.
 * @returns {'minor' | 'moderate' | 'severe' | 'extreme'}
 */
function mapSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
  const s = severity.toLowerCase();
  if (s.includes('extreme') || s.includes('red')) return 'extreme';
  if (s.includes('severe') || s.includes('orange')) return 'severe';
  if (s.includes('moderate') || s.includes('yellow')) return 'moderate';
  return 'minor';
}

/**
 * Determines if the current weather conditions are safe for a roof inspection.
 * This function provides a quick safety check based on wind speed and precipitation.
 *
 * @param {Weather} weather - The current weather object.
 * @returns {{ safe: boolean; reason?: string }} An object indicating if it's safe and an optional reason if not.
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
