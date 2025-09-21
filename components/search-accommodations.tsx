import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Star, MapPin, DollarSign, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { TravelCriteria } from "@/lib/types/travel";
import { validateTravelCriteria, getValidationProgress } from "@/lib/utils/travel-validation";
import { AnimatedProgress } from "./animated-progress";

interface AccommodationResult {
  id: string;
  name: string;
  price: number;
  rating: number;
  description: string;
  amenities: string[];
  location: string;
}

interface SearchProgressProps {
  criteria: TravelCriteria;
  onSearchResults: (results: AccommodationResult[]) => void;
}

export function SearchAccommodations({ criteria, onSearchResults }: SearchProgressProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [currentProgressStep, setCurrentProgressStep] = useState(0);

  const progressSteps = [
    "Searching Accommodations",
    "Evaluating Properties",
    "AI Ranking Results",
    "Results Ready"
  ];

  const validation = validateTravelCriteria(criteria);
  const validationProgress = getValidationProgress(criteria);

  const handleSearch = async () => {
    if (!validation.canSearchBasic || isSearching) return;

    setIsSearching(true);
    setProgress([]);
    setCurrentProgressStep(0);

    try {
      const response = await fetch('/api/search-accommodations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(criteria),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setProgress(prev => [...prev, data.message]);
                // Update progress step based on message content
                if (data.message.includes('Evaluating') || data.message.includes('AI evaluating')) {
                  setCurrentProgressStep(1);
                } else if (data.message.includes('Ranking') || data.message.includes('evaluation complete')) {
                  setCurrentProgressStep(2);
                }
              } else if (data.type === 'results') {
                onSearchResults(data.accommodations);
                setCurrentProgressStep(2);
              } else if (data.type === 'complete') {
                setCurrentProgressStep(3);
                setIsSearching(false);
              } else if (data.type === 'error') {
                setProgress(prev => [...prev, `❌ ${data.message}`]);
                setIsSearching(false);
              }
            } catch (e) {
              // Ignore malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setProgress(prev => [...prev, '❌ Search failed. Please try again.']);
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                onClick={handleSearch}
                disabled={!validation.canSearchBasic || isSearching}
                className={`w-full border transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  validation.canSearchEnhanced
                    ? 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white shadow-lg border-blue-500'
                    : validation.canSearchBasic
                    ? 'bg-white border-gray-300 hover:bg-gray-50 text-gray-800'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
                size="lg"
              >
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? 'Searching...' :
                 validation.canSearchEnhanced ? 'Start Enhanced Search' :
                 validation.canSearchBasic ? 'Start Basic Search' :
                 'Start Accommodation Search'}
              </Button>
            </div>
          </TooltipTrigger>
          {!validation.canSearchBasic && (
            <TooltipContent className="bg-white border border-gray-200 text-gray-800 shadow-lg">
              <p>{validation.message}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Validation Progress */}
      <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 p-4 transition-all duration-200 hover:shadow-2xl">
        <div className="pb-3">
          <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
            Search Requirements ({validationProgress.completed}/{validationProgress.total})
          </h3>
        </div>
        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 transition-all duration-200 hover:bg-gray-100">
              {validationProgress.requirements.destination ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-gray-400" />
              )}
              <span className={validationProgress.requirements.destination ? "text-green-600" : "text-gray-500"}>
                Destination {criteria.destination ? `(${criteria.destination})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 transition-all duration-200 hover:bg-gray-100">
              {validationProgress.requirements.checkIn ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-gray-400" />
              )}
              <span className={validationProgress.requirements.checkIn ? "text-green-600" : "text-gray-500"}>
                Check-in Date {criteria.checkIn ? `(${criteria.checkIn})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 transition-all duration-200 hover:bg-gray-100">
              {validationProgress.requirements.checkOut ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-gray-400" />
              )}
              <span className={validationProgress.requirements.checkOut ? "text-green-600" : "text-gray-500"}>
                Check-out Date {criteria.checkOut ? `(${criteria.checkOut})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 transition-all duration-200 hover:bg-gray-100">
              {validationProgress.requirements.guests ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-gray-400" />
              )}
              <span className={validationProgress.requirements.guests ? "text-green-600" : "text-gray-500"}>
                Number of Guests {criteria.guests ? `(${criteria.guests})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-50 border border-gray-200 transition-all duration-200 hover:bg-gray-100">
              {validationProgress.requirements.budget ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className="h-3 w-3 text-gray-400" />
              )}
              <span className={validationProgress.requirements.budget ? "text-green-600" : "text-gray-500"}>
                Budget Per Night {criteria.budget?.max ? `(Up to $${criteria.budget.max})` : ''}
              </span>
            </div>
          </div>

          {/* Show validation errors */}
          {validation.errors.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              {validation.errors.map((error, index) => (
                <div key={index} className="text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Progress</span>
              <span className="text-xs text-gray-600">{Math.round(validationProgress.percentage)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 transition-all duration-500 shadow-sm"
                style={{ width: `${validationProgress.percentage}%` }}
              />
            </div>
          </div>

          {!validation.isValid && (
            <p className="text-xs text-gray-600 mt-2 p-2 rounded-lg bg-gray-50">
              {validation.message}
            </p>
          )}
        </div>
      </div>

      {(isSearching || progress.length > 0) && (
        <AnimatedProgress
          steps={progressSteps}
          currentStep={currentProgressStep}
          isActive={isSearching}
        />
      )}

      {progress.length > 0 && (
        <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 p-4 transition-all duration-200 hover:shadow-2xl">
          <div className="pb-3">
            <h3 className="text-xs font-semibold text-gray-800">Detailed Progress</h3>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {progress.map((message, index) => {
              const isError = message.includes('❌');
              const isCompleted = message.includes('Search completed');
              const isInProgress = !isError && !isCompleted && isSearching && index === progress.length - 1;

              return (
                <div key={index} className="text-xs flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                  {isInProgress && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-sm" />
                  )}
                  {isCompleted && (
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-sm" />
                  )}
                  {!isInProgress && !isCompleted && !isError && (
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full shadow-sm" />
                  )}
                  <span className={
                    isError ? 'text-red-600' :
                    isCompleted ? 'text-green-600 font-medium' :
                    'text-gray-700'
                  }>
                    {message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

