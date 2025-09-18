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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Travel Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Start chatting to build your travel criteria
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
              <AlertTriangle className="h-3 w-3" />
              <span>Start by telling me your destination</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Travel Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criteria.destination && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{criteria.destination}</span>
          </div>
        )}

        {(criteria.checkIn || criteria.checkOut) && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dates</span>
            </div>
            <div className="ml-6 text-sm text-muted-foreground">
              {criteria.checkIn && <div>Check-in: {criteria.checkIn}</div>}
              {criteria.checkOut && <div>Check-out: {criteria.checkOut}</div>}
            </div>
          </div>
        )}

        {criteria.guests && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {criteria.guests} guest{criteria.guests > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {criteria.budget && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Budget</span>
            </div>
            <div className="ml-6 text-sm text-muted-foreground">
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Amenities</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {criteria.amenities.map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Context Section */}
        {enhancedProgress.completed > 0 && (
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Enhanced Context ({enhancedProgress.completed}/{enhancedProgress.total})
            </h4>

            {criteria.tripPurpose && (
              <div className="flex items-center gap-2 text-sm mb-2">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span className="capitalize">{criteria.tripPurpose} trip</span>
              </div>
            )}

            {criteria.propertyType && (
              <div className="flex items-center gap-2 text-sm mb-2">
                <Home className="h-3 w-3 text-muted-foreground" />
                <span className="capitalize">{criteria.propertyType}</span>
              </div>
            )}

            {criteria.locationPreferences && criteria.locationPreferences.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <LocationIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Location Preferences</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-5">
                  {criteria.locationPreferences.map((pref, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {criteria.amenities && criteria.amenities.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Star className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Required Amenities</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-5">
                  {criteria.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
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
                  <span className="text-xs text-muted-foreground">Special Requirements</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-5">
                  {criteria.additionalRequests.map((request, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {request}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {criteria.flexibleCancellation !== undefined && (
              <div className="flex items-center gap-2 text-sm mb-1">
                <CreditCard className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{criteria.flexibleCancellation ? 'Flexible cancellation needed' : 'Standard cancellation OK'}</span>
              </div>
            )}
          </div>
        )}

        {/* Next Missing Criteria Hint */}
        {nextMissing && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded mt-3">
            <AlertTriangle className="h-3 w-3" />
            <span>Still need: {nextMissing}</span>
          </div>
        )}

        {/* Next Enhanced Criteria Hint */}
        {!nextMissing && nextEnhanced && enhancedProgress.completed < 8 && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded mt-3">
            <Star className="h-3 w-3" />
            <span>Tell me about your {nextEnhanced} to improve results</span>
          </div>
        )}

        {/* Rich context achievement */}
        {enhancedProgress.completed >= 8 && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded mt-3">
            <Star className="h-3 w-3" />
            <span>Rich context captured! Ready for comprehensive search</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}