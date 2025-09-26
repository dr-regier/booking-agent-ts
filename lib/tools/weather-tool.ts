import { tool } from 'ai';
import { z } from 'zod';
import { WeatherService } from '@/lib/services/weather-api';

// Initialize weather service
const weatherService = new WeatherService();

export const weatherTool = tool({
  description: 'Get current weather information for a city or destination. Use this when discussing travel destinations to provide helpful weather context.',
  inputSchema: z.object({
    city: z.string().describe('The city or destination name to get weather information for. Can include country for disambiguation (e.g., "Paris, France")'),
  }),
  execute: async ({ city }) => {
    try {
      const weatherData = await weatherService.getCurrentWeather(city);

      return {
        success: true,
        data: {
          location: `${weatherData.city}, ${weatherData.country}`,
          temperature: weatherData.temperature,
          temperatureFahrenheit: WeatherService.convertTemperature(weatherData.temperature, true),
          description: weatherData.description,
          humidity: weatherData.humidity,
          windSpeed: WeatherService.formatWindSpeed(weatherData.windSpeed),
          icon: weatherData.icon,
          iconUrl: WeatherService.getWeatherIconUrl(weatherData.icon),
          timestamp: new Date(weatherData.timestamp).toISOString(),
        },
      };
    } catch (error) {
      console.error('Weather tool error:', error);

      // Return graceful fallback instead of throwing
      return {
        success: false,
        error: 'Weather data is temporarily unavailable. Please try again later.',
        city: city,
        fallback: true,
      };
    }
  },
});

export type WeatherToolResult = {
  success: true;
  data: {
    location: string;
    temperature: number;
    temperatureFahrenheit: number;
    description: string;
    humidity: number;
    windSpeed: string;
    icon: string;
    iconUrl: string;
    timestamp: string;
  };
} | {
  success: false;
  error: string;
  city: string;
};