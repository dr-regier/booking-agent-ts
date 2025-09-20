import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, DollarSign, Star, AlertTriangle, Briefcase, Home, MapPin as LocationIcon, CreditCard } from "lucide-react";
import type { TravelCriteria } from "@/lib/types/travel";
import { getNextMissingCriteria } from "@/lib/utils/travel-validation";
import { getEnhancedCriteriaProgress, getNextEnhancedCriteria } from "@/lib/utils/enhanced-extractor";

interface TravelSummaryProps {
  criteria: TravelCriteria;
}

export function TravelSummary({ criteria }: TravelSummaryProps) {
  const hasAnyCriteria =
    criteria.destination ||
    criteria.checkIn ||
    criteria.checkOut ||
    criteria.guests ||
    criteria.budget ||
    (criteria.amenities && criteria.amenities.length > 0) ||
    criteria.tripPurpose ||
    (criteria.locationPreferences && criteria.locationPreferences.length > 0) ||
    criteria.propertyType ||
    criteria.flexibleCancellation !== undefined;

  const nextMissing = getNextMissingCriteria(criteria);
  const enhancedProgress = getEnhancedCriteriaProgress(criteria);
  const nextEnhanced = getNextEnhancedCriteria(criteria);

  if (!hasAnyCriteria) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 p-6 transition-all duration-200 hover:shadow-2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Travel Summary
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Start chatting to build your travel criteria
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertTriangle className="h-3 w-3" />
              <span>Start by telling me your destination</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 p-6 transition-all duration-200 hover:shadow-2xl">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Travel Summary
        </h3>
        <div className="space-y-4">
        {criteria.destination && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 transition-all duration-200 hover:bg-blue-100">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-800">{criteria.destination}</span>
          </div>
        )}

        {(criteria.checkIn || criteria.checkOut) && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 space-y-2 transition-all duration-200 hover:bg-teal-100">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-gray-800">Dates</span>
            </div>
            <div className="ml-6 text-sm text-gray-700 space-y-1">
              {criteria.checkIn && <div>Check-in: {criteria.checkIn}</div>}
              {criteria.checkOut && <div>Check-out: {criteria.checkOut}</div>}
            </div>
          </div>
        )}

        {criteria.guests && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200 transition-all duration-200 hover:bg-indigo-100">
            <Users className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-gray-800">
              {criteria.guests} guest{criteria.guests > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {criteria.budget && (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200 space-y-2 transition-all duration-200 hover:bg-green-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-800">Budget</span>
            </div>
            <div className="ml-6 text-sm text-gray-700">
              {criteria.budget.min && criteria.budget.max ? (
                `${criteria.budget.currency || '$'}${criteria.budget.min} - ${criteria.budget.currency || '$'}${criteria.budget.max}`
              ) : criteria.budget.max ? (
                `Up to ${criteria.budget.currency || '$'}${criteria.budget.max}`
              ) : criteria.budget.min ? (
                `From ${criteria.budget.currency || '$'}${criteria.budget.min}`
              ) : 'Budget conscious'}
            </div>
          </div>
        )}

        {criteria.amenities && criteria.amenities.length > 0 && (
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-3 transition-all duration-200 hover:bg-purple-100">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-800">Amenities</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {criteria.amenities.map((amenity, index) => (
                <span key={index} className="px-2 py-1 rounded-lg bg-blue-100 border border-blue-300 text-xs text-blue-700 transition-all duration-200 hover:bg-blue-200">
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Context Section */}
        {enhancedProgress.completed > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-gray-800">
              <Star className="h-4 w-4 text-amber-500" />
              Enhanced Context ({enhancedProgress.completed}/{enhancedProgress.total})
            </h4>

            {criteria.tripPurpose && (
              <div className="flex items-center gap-2 text-sm mb-2 text-gray-700">
                <Briefcase className="h-3 w-3 text-gray-500" />
                <span className="capitalize">{criteria.tripPurpose} trip</span>
              </div>
            )}

            {criteria.propertyType && (
              <div className="flex items-center gap-2 text-sm mb-2 text-gray-700">
                <Home className="h-3 w-3 text-gray-500" />
                <span className="capitalize">{criteria.propertyType}</span>
              </div>
            )}

            {criteria.locationPreferences && criteria.locationPreferences.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <LocationIcon className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Location Preferences</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-5">
                  {criteria.locationPreferences.map((pref, index) => (
                    <Badge key={index} variant="outline" className="text-xs border-gray-300 text-gray-700">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {criteria.amenities && criteria.amenities.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Star className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Required Amenities</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-5">
                  {criteria.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {criteria.additionalRequests && criteria.additionalRequests.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-xs text-gray-600">Special Requirements</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-5">
                  {criteria.additionalRequests.map((request, index) => (
                    <Badge key={index} variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-300">
                      {request}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {criteria.flexibleCancellation !== undefined && (
              <div className="flex items-center gap-2 text-sm mb-1 text-gray-700">
                <CreditCard className="h-3 w-3 text-gray-500" />
                <span className="text-xs">{criteria.flexibleCancellation ? 'Flexible cancellation needed' : 'Standard cancellation OK'}</span>
              </div>
            )}
          </div>
        )}

        {/* Next Missing Criteria Hint */}
        {nextMissing && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-3">
            <AlertTriangle className="h-3 w-3" />
            <span>Still need: {nextMissing}</span>
          </div>
        )}

        {/* Next Enhanced Criteria Hint */}
        {!nextMissing && nextEnhanced && enhancedProgress.completed < 8 && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200 mt-3">
            <Star className="h-3 w-3" />
            <span>Tell me about your {nextEnhanced} to improve results</span>
          </div>
        )}

        {/* Rich context achievement */}
        {enhancedProgress.completed >= 8 && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 mt-3">
            <Star className="h-3 w-3" />
            <span>Rich context captured! Ready for comprehensive search</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}