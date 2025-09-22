import { BookingSearchParams, RawPropertyData, ProgressCallback } from './types';

interface BookingApiResponse {
  result: {
    hotel_id: string;
    hotel_name: string;
    address: string;
    min_total_price: number;
    review_score: number;
    review_score_word: string;
    main_photo_url: string;
    url: string;
    accommodation_type_name: string;
    distance_to_cc: string;
    review_nr: number;
  }[];
}

export class BookingApiService {
  private progressCallback: ProgressCallback;
  private apiKey: string;
  private baseUrl = 'https://booking-com.p.rapidapi.com/v1';

  constructor(progressCallback: ProgressCallback) {
    this.progressCallback = progressCallback;
    this.apiKey = process.env.RAPIDAPI_KEY || '';

    if (!this.apiKey) {
      throw new Error('RAPIDAPI_KEY environment variable is required');
    }
  }

  async searchAccommodations(params: BookingSearchParams): Promise<RawPropertyData[]> {
    this.progressCallback('Fetching accommodation data from Booking.com API...');

    try {
      // First, get destination ID
      const destId = await this.getDestinationId(params.destination);
      if (!destId) {
        throw new Error(`Could not find destination ID for: ${params.destination}`);
      }

      // Then search for hotels
      const properties = await this.searchHotels(destId, params);

      this.progressCallback(`Found ${properties.length} properties from Booking.com API`);
      return properties;

    } catch (error) {
      console.error('Booking.com API error:', error);
      this.progressCallback('Booking.com API search failed, continuing with available results...');
      return [];
    }
  }

  private async getDestinationId(destination: string): Promise<string | null> {
    this.progressCallback(`Looking up destination: ${destination}...`);

    try {
      const response = await fetch(`${this.baseUrl}/hotels/locations?name=${encodeURIComponent(destination)}&locale=en-gb`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Find the first city result
      const cityResult = data.find((item: any) => item.dest_type === 'city' || item.dest_type === 'region');
      return cityResult?.dest_id || null;

    } catch (error) {
      console.error('Error getting destination ID:', error);
      return null;
    }
  }

  private async searchHotels(destId: string, params: BookingSearchParams): Promise<RawPropertyData[]> {
    this.progressCallback('Searching hotels via Booking.com API...');

    try {
      // Build API parameters
      const searchParams = new URLSearchParams({
        dest_id: destId,
        order_by: 'popularity',
        adults_number: (params.guests || 2).toString(),
        room_number: '1',
        filter_by_currency: 'USD',
        locale: 'en-gb',
        units: 'metric'
      });

      // Add dates if provided
      if (params.checkIn) {
        searchParams.append('checkin_date', params.checkIn);
      }
      if (params.checkOut) {
        searchParams.append('checkout_date', params.checkOut);
      }

      const response = await fetch(`${this.baseUrl}/hotels/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`Hotels search failed: ${response.status}`);
      }

      const data: BookingApiResponse = await response.json();

      // Convert API response to our property format
      return this.convertApiResults(data.result || []);

    } catch (error) {
      console.error('Error searching hotels:', error);
      return [];
    }
  }

  private convertApiResults(apiResults: BookingApiResponse['result']): RawPropertyData[] {
    return apiResults.slice(0, 20).map((hotel, index) => {
      this.progressCallback(`Processing property ${index + 1}: ${hotel.hotel_name}`);

      return {
        name: hotel.hotel_name || 'Unknown Property',
        price: Math.round(hotel.min_total_price || 0),
        rating: hotel.review_score || 0,
        description: `${hotel.accommodation_type_name || 'Accommodation'} in ${hotel.address || 'destination'}. ${hotel.review_score_word || ''} rated property with ${hotel.review_nr || 0} reviews.`,
        amenities: this.extractAmenities(hotel),
        location: hotel.address || 'Location not specified',
        imageUrl: hotel.main_photo_url,
        bookingUrl: hotel.url,
        source: 'booking.com'
      };
    });
  }

  private extractAmenities(hotel: BookingApiResponse['result'][0]): string[] {
    const amenities: string[] = [];

    // Add amenities based on available data
    if (hotel.accommodation_type_name) {
      amenities.push(hotel.accommodation_type_name);
    }

    if (hotel.distance_to_cc) {
      amenities.push(`${hotel.distance_to_cc} from city center`);
    }

    // Add some common amenities (this could be enhanced with additional API calls)
    amenities.push('WiFi', 'Reception', 'Room Service');

    return amenities;
  }
}