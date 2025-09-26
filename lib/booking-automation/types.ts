export interface BookingSearchParams {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  budget?: {
    min?: number;
    max?: number;
  };
}

export interface RawPropertyData {
  name: string;
  price: number;
  rating?: number;
  description?: string;
  amenities: string[];
  location: string;
  imageUrl?: string;
  bookingUrl?: string;
  source: 'google_hotels' | 'booking.com' | 'airbnb.com' | 'hotels.com' | 'expedia.com';
}

export interface PropertyEvaluation {
  property: RawPropertyData;
  matchScore: number;
  aiReasoning: string;
}

export interface ProgressCallback {
  (message: string): void;
}