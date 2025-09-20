import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, DollarSign, Users, Wifi, Car, Coffee, Waves, Heart, ExternalLink } from "lucide-react";

interface AccommodationResult {
  id: string;
  name: string;
  price: number;
  rating: number;
  description: string;
  amenities: string[];
  location: string;
}

interface SearchResultsProps {
  results: AccommodationResult[];
  onClear: () => void;
}

const getAmenityIcon = (amenity: string) => {
  const amenityLower = amenity.toLowerCase();
  if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return <Wifi className="h-3 w-3" />;
  if (amenityLower.includes('parking') || amenityLower.includes('garage')) return <Car className="h-3 w-3" />;
  if (amenityLower.includes('breakfast') || amenityLower.includes('coffee')) return <Coffee className="h-3 w-3" />;
  if (amenityLower.includes('pool') || amenityLower.includes('swimming')) return <Waves className="h-3 w-3" />;
  return <Heart className="h-3 w-3" />;
};

export function SearchResults({ results, onClear }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Results Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            Search Results
          </h2>
          <p className="text-gray-600 mt-1">Found {results.length} accommodation{results.length !== 1 ? 's' : ''} matching your criteria</p>
        </div>
        <Button
          variant="outline"
          onClick={onClear}
          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105 flex items-center gap-2"
        >
          <Heart className="h-4 w-4" />
          Clear Results
        </Button>
      </div>

      {/* Property Cards Grid */}
      <div className="grid gap-6">
        {results.map((accommodation, index) => (
          <Card
            key={accommodation.id}
            className="overflow-hidden bg-white border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="grid md:grid-cols-3 gap-0">
              {/* Property Image Placeholder */}
              <div className="bg-gradient-to-br from-blue-100 via-teal-50 to-blue-200 h-64 md:h-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="text-6xl opacity-30">🏨</div>
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/90 text-gray-800 border border-gray-300">
                    Featured
                  </Badge>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 rounded-lg px-2 py-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-800">{accommodation.rating}</span>
                </div>
              </div>

              {/* Property Details */}
              <div className="md:col-span-2 p-6 space-y-4">
                {/* Header with Name and Price */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-800 leading-tight">{accommodation.name}</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{accommodation.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-2xl font-bold text-gray-800">
                      <DollarSign className="h-5 w-5" />
                      {accommodation.price}
                    </div>
                    <span className="text-sm text-gray-600">per night</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-700 leading-relaxed text-sm">
                  {accommodation.description}
                </p>

                {/* Amenities */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Amenities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {accommodation.amenities.map((amenity, amenityIndex) => (
                      <div
                        key={amenityIndex}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium transition-all duration-200 hover:bg-blue-100"
                      >
                        {getAmenityIcon(amenity)}
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Match Score */}
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        AI Match Score
                      </h4>
                      <p className="text-xs text-gray-600">
                        This property matches your criteria for budget-friendly accommodation with excellent amenities
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">95%</div>
                      <div className="text-xs text-gray-600">Match</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          size="lg"
          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
        >
          Load More Results
        </Button>
      </div>
    </div>
  );
}