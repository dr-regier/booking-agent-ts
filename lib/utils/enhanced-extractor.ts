import type { TravelCriteria, ExtractedCriteria, EnhancedCriteriaProgress } from '@/lib/types/travel';

export function extractEnhancedCriteria(message: string, existing: ExtractedCriteria = {}): ExtractedCriteria {
  const extracted: ExtractedCriteria = { ...existing };
  const lowerMessage = message.toLowerCase();

  // Extract trip purpose
  const tripPurposePatterns = [
    /(?:this is|it's|for)?\s*(?:a|an)?\s*(business|work|corporate|conference|meeting)\s*trip/gi,
    /(?:on|for)\s*(business|work)/gi,
    /(?:vacation|holiday|leisure|pleasure|relaxation|getaway)\s*trip/gi,
    /(?:romantic|honeymoon|anniversary|date|couples?)\s*(?:trip|getaway|vacation)/gi,
    /(?:family|kids?|children|with\s*family)\s*(?:trip|vacation|holiday)/gi,
    /(?:wedding|celebration|event|party)/gi,
    /(?:adventure|hiking|skiing|beach|sightseeing|tourist|tourism)/gi,
  ];

  for (const pattern of tripPurposePatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        const purpose = match[1].toLowerCase();
        if (purpose.includes('business') || purpose.includes('work') || purpose.includes('corporate')) {
          extracted.tripPurpose = 'business';
        } else if (purpose.includes('romantic') || purpose.includes('honeymoon') || purpose.includes('anniversary')) {
          extracted.tripPurpose = 'romantic';
        } else if (purpose.includes('family') || purpose.includes('kids') || purpose.includes('children')) {
          extracted.tripPurpose = 'family';
        } else {
          extracted.tripPurpose = 'vacation';
        }
        break;
      }
    }
    if (extracted.tripPurpose) break;
  }

  // Extract location preferences
  const locationKeywords = [
    'nightlife', 'bars', 'restaurants', 'entertainment', 'downtown', 'city center',
    'quiet', 'peaceful', 'residential', 'away from crowds',
    'walkable', 'walking distance', 'pedestrian', 'on foot',
    'near transit', 'subway', 'metro', 'public transport', 'train station',
    'beach', 'waterfront', 'ocean', 'seaside', 'coastal',
    'historic', 'old town', 'cultural', 'museums', 'landmarks',
    'shopping', 'mall', 'boutiques', 'retail',
    'business district', 'financial district', 'corporate area',
  ];

  const foundLocationPrefs: string[] = existing.locationPreferences || [];
  for (const keyword of locationKeywords) {
    if (lowerMessage.includes(keyword) && !foundLocationPrefs.includes(keyword)) {
      foundLocationPrefs.push(keyword);
    }
  }
  if (foundLocationPrefs.length > 0) {
    extracted.locationPreferences = foundLocationPrefs;
  }

  // Extract property type preferences with enhanced specificity
  const propertyTypePatterns = [
    // Explicit preferences
    /(?:prefer|want|looking for|need)\s*(?:a|an)?\s*(hotel|resort|inn|lodge)/gi,
    /(?:prefer|want|looking for|need)\s*(?:a|an)?\s*(apartment|condo|flat|rental)/gi,
    /(?:prefer|want|looking for|need)\s*(?:a|an)?\s*(villa|house|home|cottage)/gi,
    /(?:prefer|want|looking for|need)\s*(?:a|an)?\s*(hostel|budget|backpacker)/gi,
    /(?:unique|unusual|special|boutique|distinctive)\s*(?:stay|accommodation|place)/gi,
    /(?:bed and breakfast|b&b|bnb)/gi,

    // Combined preferences
    /(apartment|house)\s*(?:\/|or)\s*(house|apartment)\s*only/gi,
    /(apartment|house|rental)\s*only/gi,

    // Exclusions
    /no\s*(hotels?|resorts?)/gi,
    /(?:don't|do not)\s*want\s*(hotels?|resorts?)/gi,
  ];

  // Check for exclusions first
  if (lowerMessage.includes('no hotel') || lowerMessage.includes("don't want hotel") || lowerMessage.includes('do not want hotel')) {
    if (!extracted.additionalRequests) extracted.additionalRequests = [];
    if (!extracted.additionalRequests.includes('no hotels')) {
      extracted.additionalRequests.push('no hotels');
    }
  }

  for (const pattern of propertyTypePatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        const type = match[1].toLowerCase();

        // Handle combined preferences
        if (pattern.source.includes('only')) {
          if (type.includes('apartment') && type.includes('house')) {
            extracted.propertyType = 'apartment/house only';
          } else if (type.includes('apartment')) {
            extracted.propertyType = 'apartment only';
          } else if (type.includes('house')) {
            extracted.propertyType = 'house only';
          }
          break;
        }

        // Regular type extraction
        if (type.includes('hotel') || type.includes('resort') || type.includes('inn')) {
          extracted.propertyType = 'hotel';
        } else if (type.includes('apartment') || type.includes('condo') || type.includes('rental')) {
          extracted.propertyType = 'apartment';
        } else if (type.includes('villa') || type.includes('house') || type.includes('cottage')) {
          extracted.propertyType = 'house';
        } else if (type.includes('hostel') || type.includes('budget') || type.includes('backpacker')) {
          extracted.propertyType = 'hostel';
        } else if (type.includes('unique') || type.includes('boutique') || type.includes('distinctive')) {
          extracted.propertyType = 'unique';
        }
        break;
      }
    }
    if (extracted.propertyType) break;
  }

  // Extract flexible cancellation preference
  const cancellationPatterns = [
    /(?:flexible|free|no penalty)\s*cancell?ation/gi,
    /(?:need|want|prefer|require)\s*(?:flexible|free)\s*cancell?ation/gi,
    /(?:refundable|changeable)\s*booking/gi,
    /(?:might|may|could)\s*(?:need to )?(?:cancel|change)/gi,
  ];

  for (const pattern of cancellationPatterns) {
    if (pattern.test(lowerMessage)) {
      extracted.flexibleCancellation = true;
      break;
    }
  }

  // Extract additional requests
  const additionalRequestPatterns = [
    /(?:also|additionally|extra|special)\s*(?:need|want|require|request)\s*([^.!?]+)/gi,
    /(?:important|essential|must have|critical)\s*(?:that|to have)?\s*([^.!?]+)/gi,
    /(?:please|could you|can you)\s*(?:make sure|ensure|find)\s*([^.!?]+)/gi,
  ];

  const foundRequests: string[] = existing.additionalRequests || [];
  for (const pattern of additionalRequestPatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 5) {
        const request = match[1].trim();
        if (!foundRequests.some(existing => existing.toLowerCase().includes(request.toLowerCase()))) {
          foundRequests.push(request);
        }
      }
    }
  }
  if (foundRequests.length > 0) {
    extracted.additionalRequests = foundRequests;
  }

  return extracted;
}

export function getEnhancedCriteriaProgress(criteria: TravelCriteria): EnhancedCriteriaProgress {
  // Count individual pieces of information rather than just categories
  let detailCount = 0;
  let totalPossible = 15; // Increased to reflect more granular tracking

  // Trip purpose (1 point)
  if (criteria.tripPurpose) detailCount += 1;

  // Location preferences (up to 3 points based on specificity)
  if (criteria.locationPreferences && criteria.locationPreferences.length > 0) {
    detailCount += Math.min(3, criteria.locationPreferences.length);
  }

  // Amenities (up to 5 points based on specificity)
  if (criteria.amenities && criteria.amenities.length > 0) {
    detailCount += Math.min(5, criteria.amenities.length);
  }

  // Property type (up to 2 points for specificity)
  if (criteria.propertyType) {
    detailCount += 1;
    if (criteria.propertyType.includes('only') || criteria.propertyType.includes('/')) {
      detailCount += 1; // Extra point for specific exclusions/preferences
    }
  }

  // Flexible cancellation (1 point)
  if (criteria.flexibleCancellation !== undefined) detailCount += 1;

  // Additional requests (up to 3 points)
  if (criteria.additionalRequests && criteria.additionalRequests.length > 0) {
    detailCount += Math.min(3, criteria.additionalRequests.length);
  }

  const progress = {
    tripPurpose: !!criteria.tripPurpose,
    locationPreferences: !!(criteria.locationPreferences && criteria.locationPreferences.length > 0),
    amenities: !!(criteria.amenities && criteria.amenities.length > 0),
    propertyType: !!criteria.propertyType,
    flexibleCancellation: criteria.flexibleCancellation !== undefined,
    completed: detailCount,
    total: totalPossible,
    percentage: Math.round((detailCount / totalPossible) * 100),
  };

  return progress;
}

export function getNextEnhancedCriteria(criteria: TravelCriteria): string | null {
  const progress = getEnhancedCriteriaProgress(criteria);

  if (!progress.tripPurpose) {
    return 'trip purpose';
  }
  if (!progress.locationPreferences) {
    return 'location preferences';
  }
  if (!progress.amenities) {
    return 'essential amenities';
  }
  if (!progress.propertyType) {
    return 'property type preference';
  }
  if (!progress.flexibleCancellation) {
    return 'cancellation flexibility';
  }

  return null; // All enhanced criteria collected
}

export function mergeEnhancedCriteria(
  existing: TravelCriteria,
  extracted: ExtractedCriteria
): TravelCriteria {
  const merged: TravelCriteria = { ...existing };

  // Merge enhanced criteria
  if (extracted.tripPurpose) {
    merged.tripPurpose = extracted.tripPurpose;
  }

  if (extracted.locationPreferences && extracted.locationPreferences.length > 0) {
    const existingPrefs = merged.locationPreferences || [];
    const newPrefs = extracted.locationPreferences.filter(
      pref => !existingPrefs.includes(pref)
    );
    merged.locationPreferences = [...existingPrefs, ...newPrefs];
  }

  if (extracted.propertyType) {
    merged.propertyType = extracted.propertyType;
  }

  if (extracted.flexibleCancellation !== undefined) {
    merged.flexibleCancellation = extracted.flexibleCancellation;
  }

  if (extracted.additionalRequests && extracted.additionalRequests.length > 0) {
    const existingRequests = merged.additionalRequests || [];
    const newRequests = extracted.additionalRequests.filter(
      req => !existingRequests.some(existing => existing.toLowerCase().includes(req.toLowerCase()))
    );
    merged.additionalRequests = [...existingRequests, ...newRequests];
  }

  return merged;
}