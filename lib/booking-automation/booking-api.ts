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
        console.error(`Destination lookup failed: ${response.status}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Destination lookup failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Destination API response:', data);

      // Find the first city result
      const cityResult = data.find((item: any) => item.dest_type === 'city' || item.dest_type === 'region');
      console.log('Found destination:', cityResult);
      return cityResult?.dest_id || null;

    } catch (error) {
      console.error('Error getting destination ID:', error);
      return null;
    }
  }

  private async searchHotels(destId: string, params: BookingSearchParams): Promise<RawPropertyData[]> {
    this.progressCallback('Searching hotels via Booking.com API...');

    try {
      // Build API parameters with required fields
      const searchParams = new URLSearchParams({
        dest_id: destId,
        dest_type: 'city',  // Required field
        order_by: 'popularity',
        adults_number: (params.guests || 2).toString(),
        room_number: '1',
        filter_by_currency: 'USD',
        locale: 'en-gb',
        units: 'metric'
      });

      // Add dates in correct format (YYYY-MM-DD) - use defaults if not provided since they're required
      let checkInDate = params.checkIn;
      let checkOutDate = params.checkOut;

      // Use default dates if not provided (API requires them)
      if (!checkInDate || !checkOutDate || checkInDate.trim() === '' || checkOutDate.trim() === '') {
        const today = new Date();
        // Use dates 7 days from now to ensure they're in the future
        const weekFromNow = new Date(today);
        weekFromNow.setDate(today.getDate() + 7);
        const dayAfterWeek = new Date(today);
        dayAfterWeek.setDate(today.getDate() + 10);

        if (!checkInDate || checkInDate.trim() === '') checkInDate = weekFromNow.toISOString().split('T')[0];
        if (!checkOutDate || checkOutDate.trim() === '') checkOutDate = dayAfterWeek.toISOString().split('T')[0];
      }

      const formattedCheckIn = this.formatDateForAPI(checkInDate);
      const formattedCheckOut = this.formatDateForAPI(checkOutDate);

      if (formattedCheckIn) {
        searchParams.append('checkin_date', formattedCheckIn);
      }
      if (formattedCheckOut) {
        searchParams.append('checkout_date', formattedCheckOut);
      }

      const response = await fetch(`${this.baseUrl}/hotels/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        console.error(`Hotels search failed: ${response.status}`);
        const errorText = await response.text();
        console.error('Hotels search error response:', errorText);
        console.error('Search params used:', Object.fromEntries(searchParams));
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
    return apiResults.slice(0, 5).map((hotel, index) => {
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

  private formatDateForAPI(dateString: string): string | null {
    try {
      // Handle various input formats and convert to YYYY-MM-DD
      let date: Date;

      if (dateString.includes('/')) {
        // Handle formats like "9/27" or "9/27/2024"
        const parts = dateString.split('/');
        if (parts.length === 2) {
          // Assume current year if only month/day provided
          const currentYear = new Date().getFullYear();
          date = new Date(currentYear, parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else if (parts.length === 3) {
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else {
          return null;
        }
      } else {
        // Try parsing as-is
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return null;
      }

      // Format as YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }
}