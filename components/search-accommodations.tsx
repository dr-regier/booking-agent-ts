import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Star, MapPin, DollarSign, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { TravelCriteria } from "@/lib/types/travel";
import { validateTravelCriteria, getValidationProgress } from "@/lib/utils/travel-validation";

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

  const validation = validateTravelCriteria(criteria);
  const validationProgress = getValidationProgress(criteria);

  const handleSearch = async () => {
    if (!validation.canSearchBasic || isSearching) return;

    setIsSearching(true);
    setProgress([]);

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
              } else if (data.type === 'results') {
                onSearchResults(data.accommodations);
              } else if (data.type === 'complete') {
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
    <div className="space-y-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                onClick={handleSearch}
                disabled={!validation.canSearchBasic || isSearching}
                className="w-full"
                size="lg"
                variant={validation.canSearchEnhanced ? "default" : validation.canSearchBasic ? "outline" : "secondary"}
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
            <TooltipContent>
              <p>{validation.message}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Validation Progress */}
      <Card className="bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            Search Requirements ({validationProgress.completed}/{validationProgress.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {validationProgress.requirements.destination ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={validationProgress.requirements.destination ? "text-green-700" : "text-muted-foreground"}>
                Destination {criteria.destination ? `(${criteria.destination})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {validationProgress.requirements.checkIn ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={validationProgress.requirements.checkIn ? "text-green-700" : "text-muted-foreground"}>
                Check-in Date {criteria.checkIn ? `(${criteria.checkIn})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {validationProgress.requirements.checkOut ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={validationProgress.requirements.checkOut ? "text-green-700" : "text-muted-foreground"}>
                Check-out Date {criteria.checkOut ? `(${criteria.checkOut})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {validationProgress.requirements.guests ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={validationProgress.requirements.guests ? "text-green-700" : "text-muted-foreground"}>
                Number of Guests {criteria.guests ? `(${criteria.guests})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {validationProgress.requirements.budget ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={validationProgress.requirements.budget ? "text-green-700" : "text-muted-foreground"}>
                Budget Per Night {criteria.budget?.max ? `(Up to $${criteria.budget.max})` : ''}
              </span>
            </div>
          </div>

          {/* Show validation errors */}
          {validation.errors.length > 0 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
              {validation.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs text-muted-foreground">{Math.round(validationProgress.percentage)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${validationProgress.percentage}%` }}
              />
            </div>
          </div>

          {!validation.isValid && (
            <p className="text-xs text-muted-foreground mt-2">
              {validation.message}
            </p>
          )}
        </CardContent>
      </Card>

      {progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Search Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {progress.map((message, index) => (
                <div key={index} className="text-sm flex items-center gap-2">
                  {!message.includes('❌') && isSearching && index === progress.length - 1 && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                  <span className={message.includes('❌') ? 'text-red-500' : 'text-muted-foreground'}>
                    {message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Search Results ({results.length} found)</h3>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear Results
        </Button>
      </div>

      <div className="space-y-3">
        {results.map((accommodation) => (
          <Card key={accommodation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-base">{accommodation.name}</h4>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {accommodation.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{accommodation.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <DollarSign className="h-4 w-4" />
                      {accommodation.price}
                      <span className="text-sm font-normal text-muted-foreground">/night</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {accommodation.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {accommodation.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}