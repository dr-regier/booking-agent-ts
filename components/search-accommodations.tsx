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
    "Search Complete"
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
                setTimeout(() => setIsSearching(false), 1000);
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
                className={`w-full backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                  validation.canSearchEnhanced
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg'
                    : validation.canSearchBasic
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-white/5 text-white/50'
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
            <TooltipContent className="backdrop-blur-md bg-white/90 text-gray-800">
              <p>{validation.message}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Validation Progress */}
      <div className="backdrop-blur-md bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transition-all duration-200 hover:shadow-2xl hover:bg-white/15">
        <div className="pb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-400" />
            )}
            Search Requirements ({validationProgress.completed}/{validationProgress.total})
          </h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10">
              {validationProgress.requirements.destination ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Circle className="h-4 w-4 text-white/40" />
              )}
              <span className={validationProgress.requirements.destination ? "text-green-300" : "text-white/60"}>
                Destination {criteria.destination ? `(${criteria.destination})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10">
              {validationProgress.requirements.checkIn ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Circle className="h-4 w-4 text-white/40" />
              )}
              <span className={validationProgress.requirements.checkIn ? "text-green-300" : "text-white/60"}>
                Check-in Date {criteria.checkIn ? `(${criteria.checkIn})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10">
              {validationProgress.requirements.checkOut ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Circle className="h-4 w-4 text-white/40" />
              )}
              <span className={validationProgress.requirements.checkOut ? "text-green-300" : "text-white/60"}>
                Check-out Date {criteria.checkOut ? `(${criteria.checkOut})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10">
              {validationProgress.requirements.guests ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Circle className="h-4 w-4 text-white/40" />
              )}
              <span className={validationProgress.requirements.guests ? "text-green-300" : "text-white/60"}>
                Number of Guests {criteria.guests ? `(${criteria.guests})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10">
              {validationProgress.requirements.budget ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Circle className="h-4 w-4 text-white/40" />
              )}
              <span className={validationProgress.requirements.budget ? "text-green-300" : "text-white/60"}>
                Budget Per Night {criteria.budget?.max ? `(Up to $${criteria.budget.max})` : ''}
              </span>
            </div>
          </div>

          {/* Show validation errors */}
          {validation.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
              {validation.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-200 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/70">Progress</span>
              <span className="text-xs text-white/70">{Math.round(validationProgress.percentage)}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 transition-all duration-500 shadow-lg"
                style={{ width: `${validationProgress.percentage}%` }}
              />
            </div>
          </div>

          {!validation.isValid && (
            <p className="text-xs text-white/60 mt-3 p-2 rounded-lg backdrop-blur-sm bg-white/5">
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
        <div className="backdrop-blur-md bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transition-all duration-200 hover:shadow-2xl hover:bg-white/15">
          <div className="pb-4">
            <h3 className="text-sm font-semibold text-white">Detailed Progress</h3>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {progress.map((message, index) => (
              <div key={index} className="text-sm flex items-center gap-3 p-2 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10">
                {!message.includes('❌') && isSearching && index === progress.length - 1 && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg" />
                )}
                <span className={message.includes('❌') ? 'text-red-300' : 'text-white/80'}>
                  {message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchResultsProps {
  results: AccommodationResult[];
  onClear: () => void;
}

export function SearchResults({ results, onClear }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Search Results ({results.length} found)</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
        >
          Clear Results
        </Button>
      </div>

      <div className="space-y-4">
        {results.map((accommodation) => (
          <div key={accommodation.id} className="backdrop-blur-md bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6 transition-all duration-300 hover:shadow-2xl hover:bg-white/15 hover:scale-105">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-base text-white">{accommodation.name}</h4>
                  <div className="flex items-center gap-1 text-sm text-white/70">
                    <MapPin className="h-3 w-3" />
                    {accommodation.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-white">{accommodation.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-lg font-bold text-white">
                    <DollarSign className="h-4 w-4" />
                    {accommodation.price}
                    <span className="text-sm font-normal text-white/70">/night</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-white/80 leading-relaxed">
                {accommodation.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {accommodation.amenities.map((amenity, index) => (
                  <span key={index} className="px-2 py-1 rounded-lg backdrop-blur-sm bg-blue-500/20 border border-blue-400/30 text-xs text-blue-200 transition-all duration-200 hover:bg-blue-500/30">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}