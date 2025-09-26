import { BookingSearchParams, RawPropertyData, PropertyEvaluation, ProgressCallback } from './types';
import { SerpApiService } from './booking-api';
import { AIPropertyEvaluator } from './ai-evaluator';
import type { TravelCriteria } from '@/lib/types/travel';

interface AccommodationResult {
  id: string;
  name: string;
  price: number;
  rating: number;
  description: string;
  amenities: string[];
  imageUrl?: string;
  location: string;
  bookingUrl?: string;
  aiReasoning?: string;
  matchScore?: number;
}

export class BookingAgent {
  private progressCallback: ProgressCallback;

  constructor(progressCallback: ProgressCallback) {
    this.progressCallback = progressCallback;
  }

  async searchAccommodations(criteria: TravelCriteria): Promise<AccommodationResult[]> {
    try {
      // Initialize services
      this.progressCallback('Initializing intelligent booking agent...');

      // Convert criteria to search params
      const searchParams = this.convertCriteriaToParams(criteria);

      // Initialize API service and AI evaluator
      const serpApi = new SerpApiService(this.progressCallback);
      const aiEvaluator = new AIPropertyEvaluator(this.progressCallback);

      // Search using SerpApi Google Hotels with comprehensive pre-filtering
      this.progressCallback('Starting intelligent accommodation search via Google Hotels...');

      const googleProperties = await serpApi.searchAccommodations(searchParams, criteria).catch(error => {
        console.error('SerpApi Google Hotels search failed:', error);
        this.progressCallback('Google Hotels search encountered issues, continuing with available results...');
        return [];
      });

      // Use Google Hotels results (can add more APIs later)
      const allProperties = [...googleProperties];

      if (allProperties.length === 0) {
        this.progressCallback('No properties found matching your criteria. Try adjusting your budget, dates, or requirements.');
        return [];
      }

      this.progressCallback(`Found ${allProperties.length} pre-filtered properties. Starting intelligent evaluation...`);

      // AI-powered evaluation and ranking
      const evaluations = await aiEvaluator.evaluateProperties(allProperties, searchParams);

      // Convert to final format
      const results = this.convertEvaluationsToResults(evaluations);

      this.progressCallback('Search complete. Properties pre-filtered and ranked by AI match score.');

      return results;

    } catch (error) {
      console.error('Booking agent error:', error);
      this.progressCallback('Search encountered an error. Please try again.');
      return [];
    }
  }

  private convertCriteriaToParams(criteria: TravelCriteria): BookingSearchParams {
    return {
      destination: criteria.destination || '',
      checkIn: criteria.checkIn,
      checkOut: criteria.checkOut,
      guests: criteria.guests,
      budget: criteria.budget
    };
  }

  private convertEvaluationsToResults(evaluations: PropertyEvaluation[]): AccommodationResult[] {
    return evaluations.map((evaluation, index) => ({
      id: `property-${index + 1}`,
      name: evaluation.property.name,
      price: evaluation.property.price,
      rating: evaluation.property.rating || 0,
      description: evaluation.property.description || 'No description available',
      amenities: evaluation.property.amenities,
      location: evaluation.property.location,
      imageUrl: evaluation.property.imageUrl,
      bookingUrl: evaluation.property.bookingUrl,
      aiReasoning: evaluation.aiReasoning,
      matchScore: evaluation.matchScore
    }));
  }

  // Method to search additional sites if gaps are identified
  private async searchAdditionalSites(
    searchParams: BookingSearchParams,
    existingResults: AccommodationResult[]
  ): Promise<RawPropertyData[]> {
    // This could be implemented to search additional APIs like Expedia, Priceline, etc.
    // if the Google Hotels search doesn't provide enough variety or good options

    const hasLowBudgetOptions = existingResults.some(r => r.price < (searchParams.budget?.min || 100));
    const hasHighRatedOptions = existingResults.some(r => r.rating > 4.0);

    if (!hasLowBudgetOptions || !hasHighRatedOptions) {
      this.progressCallback('Considering additional hotel sources for broader coverage...');
      // Implementation would go here for additional APIs
    }

    return [];
  }
}