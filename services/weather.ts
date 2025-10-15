// services/weather.ts
// Weather API integration using EXPO_PUBLIC_WEATHER_API_KEY

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
const WEATHER_API_BASE = 'https://api.weatherapi.com/v1'; // or OpenWeatherMap

export interface Weather {
  temperature: number;
  condition: string;
  icon: string;
  windSpeed: number;
  humidity: number;
  feelsLike: number;
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
 * Get current weather for a location
 */
export async function getWeather(lat: number, lon: number): Promise<Weather | null> {
  if (!WEATHER_API_KEY) {
    console.warn('Weather API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${WEATHER_API_BASE}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    
    return {
      temperature: data.current.temp_f,
      condition: data.current.condition.text,
      icon: data.current.condition.icon,
      windSpeed: data.current.wind_mph,
      humidity: data.current.humidity,
      feelsLike: data.current.feelslike_f,
    };
  } catch (error: any) {
    console.error('Weather fetch error:', error);
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
      `${WEATHER_API_BASE}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&alerts=yes&days=1`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const alerts = data.alerts?.alert || [];

    return alerts.map((alert: any) => ({
      headline: alert.headline,
      severity: mapSeverity(alert.severity),
      description: alert.desc,
      expires: alert.expires,
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
      `${WEATHER_API_BASE}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=${days}&aqi=no&alerts=no`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const forecastDays = data.forecast?.forecastday || [];

    return forecastDays.map((day: any) => ({
      date: day.date,
      high: day.day.maxtemp_f,
      low: day.day.mintemp_f,
      condition: day.day.condition.text,
      precipChance: day.day.daily_chance_of_rain,
    }));
  } catch (error) {
    console.error('Forecast error:', error);
    return [];
  }
}

function mapSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
  const s = severity.toLowerCase();
  if (s.includes('extreme')) return 'extreme';
  if (s.includes('severe')) return 'severe';
  if (s.includes('moderate')) return 'moderate';
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

