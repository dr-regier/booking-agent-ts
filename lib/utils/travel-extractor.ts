import type { TravelCriteria, ExtractedCriteria } from "@/lib/types/travel";

export function extractTravelCriteria(message: string): ExtractedCriteria {
  const extracted: ExtractedCriteria = {};
  const lowerMessage = message.toLowerCase();

  // Extract destination
  const destinationPatterns = [
    /(?:going to|traveling to|visiting|trip to|vacation in|staying in)\s+([a-zA-Z\s,]+?)(?:\s|$|,|\.|!|\?)/,
    /(?:in|to)\s+([a-zA-Z\s,]{3,30})(?:\s+for|\s+from|\s+in|\s*,|\s*\.|\s*!|\s*\?|$)/,
  ];

  for (const pattern of destinationPatterns) {
    const match = lowerMessage.match(pattern);
    if (match && match[1]) {
      const destination = match[1].trim().replace(/^(the|a|an)\s+/i, '');
      if (destination.length > 2 && destination.length < 50) {
        extracted.destination = destination;
        break;
      }
    }
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
  ];

  for (const pattern of guestPatterns) {
    const matches = Array.from(lowerMessage.matchAll(pattern));
    for (const match of matches) {
      if (match && match[1]) {
        const guests = parseInt(match[1]);
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
    // Per night patterns (priority)
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

  // Extract amenities
  const amenityKeywords = [
    'pool', 'wifi', 'parking', 'gym', 'spa', 'restaurant', 'bar', 'beach',
    'ocean view', 'city view', 'balcony', 'kitchen', 'breakfast', 'pets allowed',
    'non-smoking', 'air conditioning', 'concierge', 'business center', 'elevator',
    'wheelchair accessible', 'family-friendly', 'adults only', 'all-inclusive'
  ];

  const foundAmenities: string[] = [];
  for (const amenity of amenityKeywords) {
    if (lowerMessage.includes(amenity)) {
      foundAmenities.push(amenity);
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