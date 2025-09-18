export interface TravelCriteria {
  // Required criteria
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };

  // Enhanced context (optional)
  amenities?: string[];
  tripPurpose?: string; // business, vacation, romantic, family, etc.
  locationPreferences?: string[]; // nightlife, quiet, near transit, walkable, etc.
  propertyType?: string; // hotel, apartment, unique stays, etc.
  flexibleCancellation?: boolean;
  additionalRequests?: string[]; // any other specific needs
}

export interface ExtractedCriteria {
  // Required criteria
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  budget?: string;

  // Enhanced context (optional)
  amenities?: string[];
  tripPurpose?: string;
  locationPreferences?: string[];
  propertyType?: string;
  flexibleCancellation?: boolean;
  additionalRequests?: string[];
}

export interface EnhancedCriteriaProgress {
  tripPurpose: boolean;
  locationPreferences: boolean;
  amenities: boolean;
  propertyType: boolean;
  flexibleCancellation: boolean;
  completed: number;
  total: number;
  percentage: number;
}