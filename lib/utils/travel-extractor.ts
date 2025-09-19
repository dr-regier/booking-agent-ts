import type { TravelCriteria, ExtractedCriteria } from "@/lib/types/travel";
import { findCityInfo, formatLocation } from "./city-database";

export function extractTravelCriteria(message: string): ExtractedCriteria {
  const extracted: ExtractedCriteria = {};
  const lowerMessage = message.toLowerCase();

  // Extract destination
  const destinationPatterns = [
    // Strong destination indicators (prioritize these)
    /(?:going to|traveling to|visiting|trip to|vacation in|staying in|flying to|heading to|go to)\s+([a-zA-Z\s,]+?)(?:\s+and|\s+for|\s+from|\s+in|\s*,|\s*\.|\s*!|\s*\?|$)/,
    // Location-specific patterns (case-insensitive now)
    /(?:in|to)\s+([a-zA-Z\s,]{3,30})(?:\s+for|\s+from|\s+in|\s*,|\s*\.|\s*!|\s*\?|$)/,
    // Standalone city/place names (fallback pattern for common cities)
    /^(new york|chicago|los angeles|miami|paris|london|tokyo|rome|barcelona|amsterdam|berlin|madrid|lisbon|dublin|prague|vienna|athens|budapest|stockholm|copenhagen|oslo|helsinki|warsaw|budapest|zurich|geneva|florence|venice|milan|naples)$/i,
    // General standalone pattern for proper nouns
    /^([A-Z][a-zA-Z\s,]{2,30})$/,
  ];

  // Activity words to exclude (things that aren't destinations)
  const activityWords = [
    'gym', 'hotel', 'restaurant', 'store', 'mall', 'office', 'bank', 'hospital',
    'school', 'university', 'work', 'meeting', 'appointment', 'event', 'party',
    'wedding', 'funeral', 'conference', 'beach', 'park', 'museum', 'theater'
  ];

  for (const pattern of destinationPatterns) {
    // Use original message for patterns that require proper capitalization
    const searchText = pattern.source.includes('^[A-Z]') ? message : lowerMessage;
    const matches = searchText.matchAll(new RegExp(pattern.source, 'gi'));

    for (const match of matches) {
      if (match && match[1]) {
        let destination = match[1].trim().replace(/^(the|a|an)\s+/i, '');

        // Skip if it's clearly an activity, not a destination
        const isActivity = activityWords.some(activity =>
          destination.toLowerCase().includes(activity)
        );

        // For known city patterns or proper nouns, accept them
        const isKnownCity = pattern.source.includes('new york|chicago|los angeles');
        const isProperNoun = /^[A-Z]/.test(destination);

        // Prefer destinations that look like proper place names
        const looksLikePlace = destination.includes(' ') ||
                               /\b(philippines?|island|city|beach|resort|hotel)\b/i.test(destination) ||
                               isKnownCity ||
                               isProperNoun;

        if (!isActivity && destination.length > 2 && destination.length < 50) {
          // Try to find city in database for intelligent formatting
          const cityInfo = findCityInfo(destination);

          if (cityInfo) {
            // Found in database - use proper formatting
            extracted.destination = formatLocation(cityInfo);
            break; // Stop on database match
          } else if (looksLikePlace || !extracted.destination) {
            // Fallback to original logic for unknown cities
            extracted.destination = destination;
            if (looksLikePlace) break; // Stop on first proper place name
          }
        }
      }
    }
    if (extracted.destination) break;
  }

  // Extract dates - enhanced patterns
  const datePatterns = [
    // Specific check-in patterns
    /(?:check.?in|arriving|from)\s+(?:on\s+)?([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/gi,
    // Specific check-out patterns
    /(?:check.?out|leaving|departing)\s+(?:on\s+)?([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/gi,
    // Date range patterns
    /(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*(?:to|until|-|through)\s*(\d{1,2}\/\d{1,2}(?:\/\d{4})?)/gi,
    /([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?)\s*(?:to|until|-|through)\s*([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?)/gi,
    // From X to Y patterns
    /from\s+([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s+(?:to|until)\s+([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)/gi,
    // Travel dates patterns
    /(?:travel|trip|stay)(?:ing|s)?\s+(?:from\s+)?([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s+(?:to|until|-|through)\s+([a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{4})?)/gi,
  ];

  for (const pattern of datePatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (pattern.source.includes('check.?in|arriving|from')) {
        extracted.checkIn = match[1]?.trim();
      } else if (pattern.source.includes('check.?out|leaving|departing')) {
        extracted.checkOut = match[1]?.trim();
      } else if (match[2]) {
        // Date range found
        extracted.checkIn = match[1]?.trim();
        extracted.checkOut = match[2]?.trim();
        break; // Use first date range found
      }
    }
  }

  // Extract guest count - enhanced patterns
  const guestPatterns = [
    /(\d+)\s+(?:guests?|people|persons?|adults?|travelers?)/gi,
    /(?:for|with)\s+(\d+)(?:\s+(?:guests?|people|persons?|adults?|travelers?))?/gi,
    /party\s+of\s+(\d+)/gi,
    /(?:group\s+of|total\s+of)\s+(\d+)/gi,
    /(\d+)\s+(?:bed|room)s?\s+(?:for|needed)/gi, // Infer from room requests
    /(?:we\s+are|there\s+are)\s+(\d+)\s+of\s+us/gi,
    // Word number patterns
    /(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:guests?|people|persons?|adults?|travelers?)/gi,
    /(?:for|with)\s+(one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+(?:guests?|people|persons?|adults?|travelers?))?/gi,
    /party\s+of\s+(one|two|three|four|five|six|seven|eight|nine|ten)/gi,
  ];

  // Helper function to convert word numbers to integers
  const wordToNumber = (word: string): number => {
    const wordMap: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    return wordMap[word.toLowerCase()] || 0;
  };

  for (const pattern of guestPatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (match && match[1]) {
        // Try parsing as number first, then as word
        let guests = parseInt(match[1]);
        if (isNaN(guests)) {
          guests = wordToNumber(match[1]);
        }

        if (guests > 0 && guests <= 20) { // Reasonable max for accommodations
          extracted.guests = guests;
          break;
        }
      }
    }
    if (extracted.guests) break; // Break outer loop if found
  }

  // Extract budget - enhanced patterns for per night amounts
  const budgetPatterns = [
    // Per night patterns with "dollars" (priority)
    /(?:under|below|max|maximum|up to)\s+(\d+(?:,\d{3})*)\s*(?:dollars?|usd|USD)\s*(?:per night|\/night|a night|nightly)/gi,
    /budget\s+(?:of\s+)?(\d+(?:,\d{3})*)\s*(?:dollars?|usd|USD)\s*(?:per night|\/night|a night|nightly)/gi,
    /(\d+(?:,\d{3})*)\s*(?:dollars?|usd|USD)\s*(?:per night|\/night|a night|nightly)/gi,
    // Per night patterns with $ symbol (priority)
    /(?:under|below|max|maximum|up to)\s+\$?(\d+(?:,\d{3})*)\s*(?:per night|\/night|a night|nightly)/gi,
    /budget\s+(?:of\s+)?\$?(\d+(?:,\d{3})*)\s*(?:per night|\/night|a night|nightly)/gi,
    /\$?(\d+(?:,\d{3})*)\s*(?:per night|\/night|a night|nightly)/gi,
    // General budget patterns (fallback to total)
    /(?:budget|spending)\s+(?:of\s+|is\s+)?(?:around\s+|about\s+)?\$?(\d+(?:,\d{3})*)\s*(?:to|-)?\s*\$?(\d+(?:,\d{3})*)?/gi,
    /(?:up to|maximum|max)\s+\$?(\d+(?:,\d{3})*)(?!\s*(?:per night|\/night|a night|nightly))/gi,
    /(?:under|below)\s+\$?(\d+(?:,\d{3})*)(?!\s*(?:per night|\/night|a night|nightly))/gi,
  ];

  for (const pattern of budgetPatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (match && match[1]) {
        const amount1 = parseInt(match[1].replace(/,/g, ''));
        const amount2 = match[2] ? parseInt(match[2].replace(/,/g, '')) : null;

        // Check if it's a per night amount
        const isPerNight = pattern.source.includes('per night|\\/night|a night|nightly');

        if (amount1 > 0 && amount1 < 10000) { // Reasonable range
          if (isPerNight) {
            // Per night budget - this is what we want for the max budget validation
            extracted.budget = `Up to $${amount1} per night`;
            break;
          } else {
            // Total budget - convert to rough per night estimate
            if (pattern.source.includes('up to|maximum|max|under|below')) {
              extracted.budget = `Up to $${amount1}`;
            } else if (amount2) {
              extracted.budget = `$${amount1} - $${amount2}`;
            } else {
              extracted.budget = `Around $${amount1}`;
            }
          }
        }
      }
    }
    if (extracted.budget) break; // Found budget, stop looking
  }

  // Extract amenities with enhanced specificity
  const specificAmenities: { [key: string]: string[] } = {
    // Kitchen specifications
    'full kitchen': ['full kitchen', 'complete kitchen', 'equipped kitchen'],
    'kitchenette': ['kitchenette', 'mini kitchen', 'small kitchen'],
    'kitchen': ['kitchen'],

    // Bed specifications
    'queen bed': ['queen bed', 'queen size bed', 'queen-size bed'],
    'king bed': ['king bed', 'king size bed', 'king-size bed'],
    'double bed': ['double bed'],
    'twin beds': ['twin beds', 'twin bed', 'two beds'],

    // Air conditioning
    'AC': ['air conditioning', 'ac', 'a/c', 'aircon', 'climate control'],

    // Internet
    'strong wifi': ['strong wifi', 'fast wifi', 'high speed wifi', 'good wifi', 'reliable wifi'],
    'wifi': ['wifi', 'wi-fi', 'internet', 'wireless'],

    // Gym access
    'gym nearby': ['gym nearby', 'nearby gym', 'gym close', 'fitness nearby', 'gym within walking'],
    'gym': ['gym', 'fitness center', 'fitness room', 'workout room'],

    // General amenities
    'pool': ['pool', 'swimming pool'],
    'parking': ['parking', 'garage'],
    'spa': ['spa'],
    'restaurant': ['restaurant'],
    'bar': ['bar'],
    'beach': ['beach', 'beachfront'],
    'ocean view': ['ocean view', 'sea view', 'water view'],
    'city view': ['city view'],
    'balcony': ['balcony', 'terrace', 'patio'],
    'breakfast': ['breakfast', 'breakfast included'],
    'pets allowed': ['pets allowed', 'pet friendly', 'pet-friendly'],
    'non-smoking': ['non-smoking', 'no smoking'],
    'concierge': ['concierge'],
    'business center': ['business center'],
    'elevator': ['elevator', 'lift'],
    'wheelchair accessible': ['wheelchair accessible', 'handicap accessible'],
    'family-friendly': ['family-friendly', 'family friendly'],
    'adults only': ['adults only', 'adult only'],
    'all-inclusive': ['all-inclusive', 'all inclusive']
  };

  const foundAmenities: string[] = [];
  for (const [amenityName, patterns] of Object.entries(specificAmenities)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern)) {
        foundAmenities.push(amenityName);
        break; // Found this amenity, move to next
      }
    }
  }

  if (foundAmenities.length > 0) {
    extracted.amenities = foundAmenities;
  }

  return extracted;
}

export function mergeTravelCriteria(
  existing: TravelCriteria,
  extracted: ExtractedCriteria
): TravelCriteria {
  const merged: TravelCriteria = { ...existing };

  if (extracted.destination) {
    merged.destination = extracted.destination;
  }

  if (extracted.checkIn) {
    merged.checkIn = extracted.checkIn;
  }

  if (extracted.checkOut) {
    merged.checkOut = extracted.checkOut;
  }

  if (extracted.guests) {
    merged.guests = extracted.guests;
  }

  if (extracted.budget) {
    // Parse budget string back into structured format
    const budgetMatch = extracted.budget.match(/\$?(\d+(?:,\d{3})*)\s*(?:-\s*\$?(\d+(?:,\d{3})*))?/);
    if (budgetMatch) {
      const amount1 = parseInt(budgetMatch[1].replace(/,/g, ''));
      const amount2 = budgetMatch[2] ? parseInt(budgetMatch[2].replace(/,/g, '')) : undefined;

      if (extracted.budget.includes('per night')) {
        // Per night budget - set as max
        merged.budget = { max: amount1, currency: '$' };
      } else if (extracted.budget.includes('Up to')) {
        merged.budget = { max: amount1, currency: '$' };
      } else if (extracted.budget.includes('From')) {
        merged.budget = { min: amount1, currency: '$' };
      } else if (amount2) {
        merged.budget = { min: amount1, max: amount2, currency: '$' };
      } else {
        // Default to using amount as max for validation purposes
        merged.budget = { max: amount1, currency: '$' };
      }
    }
  }

  if (extracted.amenities && extracted.amenities.length > 0) {
    const existingAmenities = merged.amenities || [];
    const newAmenities = extracted.amenities.filter(
      amenity => !existingAmenities.includes(amenity)
    );
    merged.amenities = [...existingAmenities, ...newAmenities];
  }

  return merged;
}