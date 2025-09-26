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
    'wedding', 'funeral', 'conference', 'beach', 'park', 'museum', 'theater',
    'building', 'high rise', 'tower', 'apartment', 'condo', 'house', 'room',
    'floor', 'view', 'balcony', 'kitchen', 'bathroom', 'bedroom', 'wifi',
    'parking', 'pool', 'spa', 'amenity', 'service', 'staff', 'check',
    'reservation', 'booking', 'price', 'cost', 'budget', 'night', 'stay'
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

  // Helper function to convert relative dates to actual dates
  const convertRelativeDate = (term: string): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const formatDate = (date: Date): string => {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const lowerTerm = term.toLowerCase();

    // Handle today/tomorrow
    if (lowerTerm === 'today') {
      return formatDate(today);
    }
    if (lowerTerm === 'tomorrow') {
      return formatDate(tomorrow);
    }

    // Handle day names (find next occurrence of that day)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = dayNames.indexOf(lowerTerm);

    if (dayIndex !== -1) {
      const targetDate = new Date(today);
      const todayDayIndex = today.getDay();
      let daysToAdd = dayIndex - todayDayIndex;

      // If the target day is today or has passed this week, go to next week
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }

      targetDate.setDate(today.getDate() + daysToAdd);
      return formatDate(targetDate);
    }

    // Return original if not recognized
    return term;
  };

  // Extract dates - enhanced patterns including relative dates
  const datePatterns = [
    // Combined check-in and check-out patterns (highest priority)
    /(?:check.?in|arriving)\s+(?:on\s+)?(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|[a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2})\s+(?:and\s+)?(?:check.?out|leaving|departing)\s+(?:on\s+)?(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|[a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2})/gi,
    // Relative date patterns with day names
    /(?:check.?in|arriving|from)\s+(?:on\s+)?(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/gi,
    /(?:check.?out|leaving|departing)\s+(?:on\s+)?(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/gi,
    /(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:check.?in|arriving)/gi,
    /(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:check.?out|leaving|departing)/gi,
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
      // Handle combined check-in and check-out pattern (has both dates)
      if (pattern.source.includes('check.?in.*check.?out') && match[1] && match[2]) {
        extracted.checkIn = convertRelativeDate(match[1].trim());
        extracted.checkOut = convertRelativeDate(match[2].trim());
        break; // Found both, stop looking
      }
      // Handle individual check-in patterns
      else if (pattern.source.includes('check.?in|arriving|from') || pattern.source.includes('.*check.?in')) {
        const dateValue = match[1]?.trim();
        if (dateValue) {
          extracted.checkIn = convertRelativeDate(dateValue);
        }
      }
      // Handle individual check-out patterns
      else if (pattern.source.includes('check.?out|leaving|departing') || pattern.source.includes('.*check.?out')) {
        const dateValue = match[1]?.trim();
        if (dateValue) {
          extracted.checkOut = convertRelativeDate(dateValue);
        }
      }
      // Handle general date ranges
      else if (match[2]) {
        extracted.checkIn = convertRelativeDate(match[1]?.trim() || '');
        extracted.checkOut = convertRelativeDate(match[2]?.trim() || '');
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
    // Family relationship patterns - these need special parsing
    /(?:me|i|myself)(?:\s*,\s*|\s+and\s+)(?:my\s+)?(?:wife|husband|spouse|partner)(?:\s*,\s*|\s+and\s+)(?:(?:one|two|three|four|five)\s+)?(?:child|children|kid|kids|son|daughter|baby|babies)/gi,
    /(?:me|i|myself)(?:\s*,\s*|\s+and\s+)(?:my\s+)?(?:wife|husband|spouse|partner)/gi,
    /(?:me|i|myself)(?:\s*,\s*|\s+and\s+)(?:(?:one|two|three|four|five)\s+)?(?:child|children|kid|kids|son|daughter|baby|babies)/gi,
    // Additional common family patterns
    /(?:my\s+)?(?:wife|husband|spouse|partner)(?:\s*,\s*|\s+and\s+)(?:me|i|myself)/gi,
    /(?:wife|husband|spouse|partner)(?:\s*,\s*|\s+and\s+)(?:me|i|myself)/gi,
    /(?:we|us)\s+are\s+(?:a\s+)?(?:couple|married|going\s+together)/gi,
    /(?:couple|two\s+of\s+us|both\s+of\s+us)/gi,
  ];

  // Helper function to convert word numbers to integers
  const wordToNumber = (word: string): number => {
    const wordMap: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    return wordMap[word.toLowerCase()] || 0;
  };

  // Helper function to parse family relationships and count total people
  const parseFamilyCount = (text: string): number => {
    let count = 0;
    const lowerText = text.toLowerCase();

    // Handle simple couple patterns first
    if (/\b(?:couple|two\s+of\s+us|both\s+of\s+us)\b/.test(lowerText)) {
      return 2;
    }

    if (/(?:we|us)\s+are\s+(?:a\s+)?(?:couple|married|going\s+together)/.test(lowerText)) {
      return 2;
    }

    // Count "me/I/myself" (always 1)
    if (/\b(?:me|i|myself)\b/.test(lowerText)) {
      count += 1;
    }

    // Count spouse/partner (always 1)
    if (/\b(?:wife|husband|spouse|partner)\b/.test(lowerText)) {
      count += 1;
    }

    // Count children - look for number before child-related words
    const childMatch = lowerText.match(/(?:one|two|three|four|five|\d+)\s+(?:child|children|kid|kids|son|daughter|baby|babies)/);
    if (childMatch) {
      const childCountStr = childMatch[0].match(/(?:one|two|three|four|five|\d+)/)?.[0];
      if (childCountStr) {
        const childCount = isNaN(parseInt(childCountStr)) ? wordToNumber(childCountStr) : parseInt(childCountStr);
        count += childCount;
      }
    } else if (/\b(?:child|children|kid|kids|son|daughter|baby|babies)\b/.test(lowerText)) {
      // If child-related words without number, assume 1
      count += 1;
    }

    return count;
  };

  // Define which patterns are family patterns (by index since pattern.source has escape sequences)
  const familyPatternIndices = new Set([9, 10, 11, 12, 13, 14, 15]); // Last 7 patterns in the array

  for (let i = 0; i < guestPatterns.length; i++) {
    const pattern = guestPatterns[i];
    const matches = Array.from(lowerMessage.matchAll(pattern));

    for (const match of matches) {
      // Check if this is a family relationship pattern by index
      if (familyPatternIndices.has(i)) {
        const familyCount = parseFamilyCount(match[0]);
        if (familyCount > 0 && familyCount <= 20) {
          extracted.guests = familyCount;
          break; // Family patterns take priority
        }
      }
      // Handle regular number patterns
      else if (match && match[1]) {
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
    // Only update destination if we don't have one yet, or if the new one is from a known city database
    const cityInfo = findCityInfo(extracted.destination);
    const hasExistingDestination = existing.destination && existing.destination.trim().length > 0;

    if (!hasExistingDestination || cityInfo) {
      merged.destination = extracted.destination;
    }
    // If we have an existing destination and the new one isn't from database, keep existing
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