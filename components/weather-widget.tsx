"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Thermometer, Droplets, Wind, MapPin, AlertCircle, RotateCcw } from 'lucide-react';
import type { WeatherToolResult } from '@/lib/tools/weather-tool';

interface WeatherWidgetProps {
  result: WeatherToolResult;
}

export function WeatherWidget({ result }: WeatherWidgetProps) {
  const [showFahrenheit, setShowFahrenheit] = useState(false);

  // Handle error state
  if (!result.success) {
    return (
      <Card className="max-w-sm mx-auto my-3 bg-red-50 border-red-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Weather Unavailable</p>
              <p className="text-sm text-red-600">{result.error}</p>
              {result.city && (
                <p className="text-xs text-red-500 mt-1">Searched for: {result.city}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state - display weather data
  const { data } = result;
  const displayTemp = showFahrenheit ? data.temperatureFahrenheit : data.temperature;
  const tempUnit = showFahrenheit ? '°F' : '°C';

  return (
    <Card className="max-w-sm mx-auto my-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm">{data.location}</h3>
          </div>
          <button
            onClick={() => setShowFahrenheit(!showFahrenheit)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-100 rounded"
            title="Toggle temperature unit"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Main weather display */}
        <div className="flex items-center gap-4 mb-4">
          {/* Weather icon */}
          <div className="flex-shrink-0">
            <img
              src={data.iconUrl}
              alt={data.description}
              className="w-16 h-16"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Temperature and description */}
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-800">{displayTemp}</span>
              <span className="text-lg text-gray-600">{tempUnit}</span>
            </div>
            <p className="text-sm text-gray-600 capitalize">{data.description}</p>
          </div>
        </div>

        {/* Weather details */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-blue-100">
          {/* Humidity */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500">Humidity</p>
            <p className="font-medium text-sm text-gray-800">{data.humidity}%</p>
          </div>

          {/* Wind */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Wind className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500">Wind</p>
            <p className="font-medium text-sm text-gray-800">{data.windSpeed}</p>
          </div>

          {/* Temperature icon */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Thermometer className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500">Feels like</p>
            <p className="font-medium text-sm text-gray-800">{displayTemp}{tempUnit}</p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="mt-3 pt-2 border-t border-blue-100">
          <p className="text-xs text-gray-400 text-center">
            Updated {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}