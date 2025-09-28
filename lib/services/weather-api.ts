import type { WeatherData, OpenWeatherMapResponse, WeatherApiError, WeatherCacheEntry } from '@/lib/types/weather';

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Simple in-memory cache
const weatherCache = new Map<string, WeatherCacheEntry>();

export class WeatherService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENWEATHERMAP_API_KEY not configured - weather functionality will be limited');
    }
  }

  async getCurrentWeather(city: string): Promise<WeatherData> {
    if (!this.apiKey) {
      throw new Error('Weather service not configured - API key missing');
    }

    // Check cache first
    const cacheKey = city.toLowerCase().trim();
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const url = new URL(`${WEATHER_API_BASE}/weather`);
      url.searchParams.append('q', city);
      url.searchParams.append('appid', this.apiKey);
      url.searchParams.append('units', 'metric'); // Celsius by default

      console.log('Making weather API request to:', url.toString());
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      console.log('Weather API response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`City "${city}" not found. Please check the spelling and try again.`);
        }
        if (response.status === 401) {
          throw new Error('Weather service authentication failed');
        }
        if (response.status === 429) {
          throw new Error('Weather service rate limit exceeded. Please try again later.');
        }
        throw new Error(`Weather service error: ${response.status}`);
      }

      const data = await response.json() as OpenWeatherMapResponse | WeatherApiError;

      // Check if response contains error
      if ('cod' in data && data.cod !== 200) {
        throw new Error(data.message || 'Weather data unavailable');
      }

      const weatherResponse = data as OpenWeatherMapResponse;

      // Validate response structure
      if (!weatherResponse.weather || !weatherResponse.main || !weatherResponse.wind) {
        throw new Error('Invalid weather data received');
      }

      const weatherData: WeatherData = {
        city: weatherResponse.name,
        country: weatherResponse.sys.country,
        temperature: Math.round(weatherResponse.main.temp),
        description: weatherResponse.weather[0].description,
        humidity: weatherResponse.main.humidity,
        windSpeed: weatherResponse.wind.speed,
        icon: weatherResponse.weather[0].icon,
        timestamp: Date.now(),
      };
      console.log('Processed weather data:', weatherData);

      // Cache the result
      weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now(),
      });

      return weatherData;

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch weather data');
    }
  }

  // Convert temperature between Celsius and Fahrenheit
  static convertTemperature(celsius: number, toFahrenheit: boolean = false): number {
    if (toFahrenheit) {
      return Math.round((celsius * 9/5) + 32);
    }
    return celsius;
  }

  // Format wind speed for display
  static formatWindSpeed(speedMs: number): string {
    const speedKmh = Math.round(speedMs * 3.6);
    return `${speedKmh} km/h`;
  }

  // Get weather icon URL from OpenWeatherMap
  static getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  // Clear cache (useful for testing)
  static clearCache(): void {
    weatherCache.clear();
  }
}