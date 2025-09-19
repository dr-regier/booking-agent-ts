import { BookingSearchParams, RawPropertyData, PropertyEvaluation, ProgressCallback } from './types';
import { BrowserManager } from './browser-manager';
import { BookingScraper } from './booking-scraper';
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
  private browserManager: BrowserManager;
  private progressCallback: ProgressCallback;

  constructor(progressCallback: ProgressCallback) {
    this.browserManager = new BrowserManager();
    this.progressCallback = progressCallback;
  }

  async searchAccommodations(criteria: TravelCriteria): Promise<AccommodationResult[]> {
    try {
      // Initialize browser
      this.progressCallback('Initializing intelligent booking agent...');
      await this.browserManager.initialize(true); // headless mode

      // Convert criteria to search params
      const searchParams = this.convertCriteriaToParams(criteria);

      // Initialize scraper and AI evaluator
      const scraper = new BookingScraper(this.browserManager, this.progressCallback);
      const aiEvaluator = new AIPropertyEvaluator(this.progressCallback);

      // Search multiple platforms concurrently for comprehensive coverage
      this.progressCallback('Starting comprehensive search across booking platforms...');

      const [bookingProperties, airbnbProperties] = await Promise.all([
        scraper.searchBookingCom(searchParams).catch(error => {
          console.error('Booking.com search failed:', error);
          this.progressCallback('Booking.com search encountered issues, continuing with available results...');
          return [];
        }),
        scraper.searchAirbnb(searchParams).catch(error => {
          console.error('Airbnb search failed:', error);
          this.progressCallback('Airbnb search encountered issues, continuing with available results...');
          return [];
        })
      ]);

      // Combine all properties
      const allProperties = [...bookingProperties, ...airbnbProperties];

      if (allProperties.length === 0) {
        this.progressCallback('No properties found. Search may have been blocked or destination not available.');
        return [];
      }

      this.progressCallback(`Found ${allProperties.length} properties. Starting intelligent evaluation...`);

      // AI-powered evaluation and ranking
      const evaluations = await aiEvaluator.evaluateProperties(allProperties, searchParams);

      // Convert to final format
      const results = this.convertEvaluationsToResults(evaluations);

      this.progressCallback('Search complete. Properties ranked by match score and value.');

      return results;

    } catch (error) {
      console.error('Booking agent error:', error);
      this.progressCallback('Search encountered an error. Please try again.');
      return [];
    } finally {
      // Always close browser
      await this.browserManager.close();
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
    // This could be implemented to search Hotels.com, Expedia, etc.
    // if the initial search doesn't provide enough variety or good options

    const hasLowBudgetOptions = existingResults.some(r => r.price < (searchParams.budget?.min || 100));
    const hasHighRatedOptions = existingResults.some(r => r.rating > 4.0);

    if (!hasLowBudgetOptions || !hasHighRatedOptions) {
      this.progressCallback('Expanding search to additional booking sites for better coverage...');
      // Implementation would go here for Hotels.com, Expedia, etc.
    }

    return [];
  }
}