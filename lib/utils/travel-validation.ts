import type { TravelCriteria, EnhancedCriteriaProgress } from '@/lib/types/travel';
import { getEnhancedCriteriaProgress, getNextEnhancedCriteria } from './enhanced-extractor';

export interface ValidationResult {
  isValid: boolean;
  missing: string[];
  errors: string[];
  message: string;
  canSearchBasic: boolean; // Can search with just required criteria
  canSearchEnhanced: boolean; // Can search with enhanced criteria
  enhancedProgress: EnhancedCriteriaProgress;
}

export interface ValidationRequirements {
  destination: boolean;
  checkIn: boolean;
  checkOut: boolean;
  guests: boolean;
  budget: boolean;
}

function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Try various date formats
  const formats = [
    // MM/DD/YYYY or MM/DD
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/,
    // Month DD, YYYY or Month DD
    /^([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/i,
  ];

  const currentYear = new Date().getFullYear();

  for (const format of formats) {
    const match = dateString.trim().match(format);
    if (match) {
      if (format.source.includes('\\d{1,2}')) {
        // MM/DD format
        const month = parseInt(match[1]) - 1; // JS months are 0-based
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : currentYear;
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      } else {
        // Month DD format
        const monthName = match[1].toLowerCase();
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : currentYear;

        const months = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = months.findIndex(m => m.startsWith(monthName.substring(0, 3)));

        if (monthIndex !== -1) {
          const date = new Date(year, monthIndex, day);
          if (!isNaN(date.getTime())) return date;
        }
      }
    }
  }
  return null;
}

export function validateTravelCriteria(criteria: TravelCriteria): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];
  const requirements: ValidationRequirements = {
    destination: false,
    checkIn: false,
    checkOut: false,
    guests: false,
    budget: false,
  };

  // Check destination
  if (criteria.destination && criteria.destination.trim().length > 2) {
    requirements.destination = true;
  } else {
    missing.push('destination');
  }

  // Check check-in date
  if (criteria.checkIn && criteria.checkIn.trim().length > 0) {
    requirements.checkIn = true;
  } else {
    missing.push('check-in date');
  }

  // Check check-out date
  if (criteria.checkOut && criteria.checkOut.trim().length > 0) {
    requirements.checkOut = true;
  } else {
    missing.push('check-out date');
  }

  // Check number of guests
  if (criteria.guests && criteria.guests > 0) {
    requirements.guests = true;
  } else {
    missing.push('number of guests');
  }

  // Check budget (5th required criteria)
  if (criteria.budget && criteria.budget.max && criteria.budget.max > 0) {
    requirements.budget = true;
  } else {
    missing.push('maximum budget per night');
  }

  // Date logic validation
  if (criteria.checkIn && criteria.checkOut) {
    const checkInDate = parseDate(criteria.checkIn);
    const checkOutDate = parseDate(criteria.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    if (checkInDate && checkOutDate) {
      // Check if dates are in the future
      if (checkInDate < today) {
        errors.push('Check-in date must be in the future');
      }
      if (checkOutDate < today) {
        errors.push('Check-out date must be in the future');
      }

      // Check if check-out is after check-in
      if (checkOutDate <= checkInDate) {
        errors.push('Check-out date must be after check-in date');
      }
    }
  }

  const canSearchBasic = missing.length === 0 && errors.length === 0;
  const enhancedProgress = getEnhancedCriteriaProgress(criteria);
  const canSearchEnhanced = canSearchBasic && enhancedProgress.completed >= 2; // Need at least 2 enhanced criteria

  const isValid = canSearchBasic; // For backwards compatibility
  const message = generateValidationMessage(missing, errors, canSearchBasic, enhancedProgress);

  return {
    isValid,
    missing,
    errors,
    message,
    canSearchBasic,
    canSearchEnhanced,
    enhancedProgress,
  };
}

function generateValidationMessage(
  missing: string[],
  errors: string[],
  canSearchBasic: boolean,
  enhancedProgress: EnhancedCriteriaProgress
): string {
  if (errors.length > 0) {
    return errors[0]; // Show first error
  }

  if (!canSearchBasic) {
    if (missing.length === 1) {
      return `Please specify ${missing[0]}`;
    }
    if (missing.length === 2) {
      return `Please specify ${missing[0]} and ${missing[1]}`;
    }
    if (missing.length === 3) {
      return `Need ${missing[0]}, ${missing[1]}, and ${missing[2]}`;
    }
    if (missing.length === 4) {
      return `Need ${missing[0]}, ${missing[1]}, ${missing[2]}, and ${missing[3]}`;
    }
    return 'Please provide destination, travel dates, number of guests, and budget';
  }

  // Basic criteria complete
  if (enhancedProgress.completed === 0) {
    return 'Continue conversation to improve search results';
  }

  if (enhancedProgress.completed < 2) {
    return `Tell me more to enhance your search (${enhancedProgress.completed}/5 optional criteria)`;
  }

  if (enhancedProgress.completed >= 2) {
    return `Ready for enhanced search! (${enhancedProgress.completed}/5 optional criteria)`;
  }

  return 'Ready to search accommodations!';
}

export function getValidationProgress(criteria: TravelCriteria): {
  completed: number;
  total: number;
  percentage: number;
  requirements: ValidationRequirements;
} {
  const validation = validateTravelCriteria(criteria);
  const total = 5; // Updated to 5 criteria
  const completed = total - validation.missing.length;
  const percentage = (completed / total) * 100;

  const requirements: ValidationRequirements = {
    destination: !!criteria.destination && criteria.destination.trim().length > 2,
    checkIn: !!criteria.checkIn && criteria.checkIn.trim().length > 0,
    checkOut: !!criteria.checkOut && criteria.checkOut.trim().length > 0,
    guests: !!criteria.guests && criteria.guests > 0,
    budget: !!criteria.budget && !!criteria.budget.max && criteria.budget.max > 0,
  };

  return {
    completed,
    total,
    percentage,
    requirements,
  };
}

export function getMissingCriteriaList(criteria: TravelCriteria): string[] {
  const validation = validateTravelCriteria(criteria);
  return validation.missing;
}

export function getNextMissingCriteria(criteria: TravelCriteria): string | null {
  const missing = getMissingCriteriaList(criteria);
  return missing.length > 0 ? missing[0] : null;
}