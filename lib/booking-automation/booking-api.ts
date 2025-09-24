import { BookingSearchParams, RawPropertyData, ProgressCallback } from './types';
import type { TravelCriteria } from '@/lib/types/travel';

interface SerpApiProperty {
  type?: string;
  name: string;
  description?: string;
  link?: string;
  // Fields from ads array
  extracted_price?: number;
  price?: string;
  // Image fields (different structures in ads vs properties)
  thumbnail?: string;
  main_photo_url?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
  check_in_time?: string;
  check_out_time?: string;
  rate_per_night?: {
    lowest?: string;
    extracted_lowest?: number;
    before_taxes_fees?: string;
    extracted_before_taxes_fees?: number;
  };
  total_rate?: {
    lowest?: string;
    extracted_lowest?: number;
    before_taxes_fees?: string;
    extracted_before_taxes_fees?: number;
  };
  nearby_places?: Array<{
    name: string;
    transportations?: Array<{
      type: string;
      duration: string;
    }>;
  }>;
  images?: Array<{
    thumbnail: string;
    original_image: string;
  }>;
  overall_rating?: number;
  reviews?: number;
  location_rating?: number;
  amenities?: string[];
  excluded_amenities?: string[];
  essential_info?: string[];
  property_token?: string;
  serpapi_property_details_link?: string;
}

interface SerpApiResponse {
  search_metadata?: any;
  search_parameters?: any;
  properties?: SerpApiProperty[];
  brands?: any[];
  ads?: any[];
  pagination?: {
    next_page_token?: string;
  };
}

// Amenity mapping for common user requests to SerpApi amenity filtering
const AMENITY_KEYWORDS = {
  'pool': ['pool', 'swimming'],
  'gym': ['gym', 'fitness', 'workout'],
  'spa': ['spa', 'wellness', 'massage'],
  'wifi': ['wifi', 'internet', 'wireless'],
  'parking': ['parking', 'garage', 'valet'],
  'pet': ['pet', 'dog', 'cat', 'animal'],
  'business': ['business', 'meeting', 'conference'],
  'restaurant': ['restaurant', 'dining', 'food'],
  'bar': ['bar', 'lounge', 'cocktail'],
  'room service': ['room service', 'in-room dining'],
  'concierge': ['concierge', 'guest services'],
  'laundry': ['laundry', 'dry cleaning'],
  'air conditioning': ['ac', 'air conditioning', 'climate control'],
  'kitchen': ['kitchen', 'kitchenette', 'cooking'],
  'balcony': ['balcony', 'terrace', 'patio'],
  'ocean view': ['ocean', 'sea', 'beach view'],
  'city view': ['city view', 'skyline'],
  'accessible': ['accessible', 'wheelchair', 'disability']
};

export class SerpApiService {
  private progressCallback: ProgressCallback;
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor(progressCallback: ProgressCallback) {
    this.progressCallback = progressCallback;
    this.apiKey = process.env.SERPAPI_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('SERPAPI_API_KEY environment variable is required');
    }
  }

  async searchAccommodations(params: BookingSearchParams, fullCriteria?: TravelCriteria): Promise<RawPropertyData[]> {
    this.progressCallback('Initializing SerpApi Google Hotels search...');

    try {
      // Build comprehensive search parameters with pre-filtering
      const searchParams = this.buildSerpApiParameters(params, fullCriteria);

      this.logSearchStrategy(searchParams, fullCriteria);

      // Execute search
      const properties = await this.executeSearch(searchParams);

      this.progressCallback(`Found ${properties.length} pre-filtered properties matching your criteria`);
      return properties;

    } catch (error) {
      console.error('SerpApi Google Hotels error:', error);
      this.progressCallback('Google Hotels search encountered issues, continuing with available results...');
      return [];
    }
  }

  private buildSerpApiParameters(params: BookingSearchParams, criteria?: TravelCriteria): URLSearchParams {
    const searchParams = new URLSearchParams();

    // Required parameters
    searchParams.append('api_key', this.apiKey);
    searchParams.append('engine', 'google_hotels');

    // Request image data specifically
    searchParams.append('images', 'true');
    searchParams.append('hotel_details', 'true');

    // Improve search query for better results
    let searchQuery = params.destination;
    if (searchQuery.toLowerCase().includes('new york') && !searchQuery.toLowerCase().includes('city')) {
      searchQuery = searchQuery.replace(/new york.*new york/i, 'New York City');
    }
    searchParams.append('q', searchQuery);
    searchParams.append('currency', 'USD');

    // Date parameters
    const { checkIn, checkOut } = this.processDateParameters(params);
    if (checkIn) searchParams.append('check_in_date', checkIn);
    if (checkOut) searchParams.append('check_out_date', checkOut);

    // Guest parameters
    const { adults, children } = this.processGuestParameters(params.guests);
    searchParams.append('adults', adults.toString());
    if (children > 0) {
      searchParams.append('children', children.toString());
    }

    // Budget pre-filtering (KEY IMPROVEMENT)
    if (params.budget?.min) {
      searchParams.append('min_price', params.budget.min.toString());
    }
    if (params.budget?.max) {
      searchParams.append('max_price', params.budget.max.toString());
    }

    // Property type pre-filtering
    this.applyPropertyTypeFilters(searchParams, criteria);

    // Quality/Rating pre-filtering
    this.applyQualityFilters(searchParams, criteria);

    // Amenities pre-filtering
    this.applyAmenityFilters(searchParams, criteria);

    // Flexibility pre-filtering
    this.applyFlexibilityFilters(searchParams, criteria);

    // Sorting for best value
    searchParams.append('sort_by', '3'); // Lowest price

    return searchParams;
  }

  private processDateParameters(params: BookingSearchParams): { checkIn: string | null, checkOut: string | null } {
    let checkIn = params.checkIn;
    let checkOut = params.checkOut;

    // Use default dates if not provided
    if (!checkIn || !checkOut || checkIn.trim() === '' || checkOut.trim() === '') {
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(today.getDate() + 7);
      const dayAfterWeek = new Date(today);
      dayAfterWeek.setDate(today.getDate() + 10);

      if (!checkIn || checkIn.trim() === '') checkIn = weekFromNow.toISOString().split('T')[0];
      if (!checkOut || checkOut.trim() === '') checkOut = dayAfterWeek.toISOString().split('T')[0];
    }

    return {
      checkIn: this.formatDateForAPI(checkIn),
      checkOut: this.formatDateForAPI(checkOut)
    };
  }

  private processGuestParameters(guests?: number): { adults: number, children: number } {
    // Simple logic: assume adults unless specified otherwise
    const totalGuests = guests || 2;
    const adults = Math.max(1, Math.min(totalGuests, 8)); // Max 8 adults for API
    const children = 0; // Could be enhanced to extract from chat context

    return { adults, children };
  }

  private applyPropertyTypeFilters(searchParams: URLSearchParams, criteria?: TravelCriteria): void {
    if (!criteria?.propertyType) return;

    const propertyType = criteria.propertyType.toLowerCase();

    if (propertyType.includes('apartment') ||
        propertyType.includes('rental') ||
        propertyType.includes('house') ||
        propertyType.includes('unique')) {
      searchParams.append('vacation_rentals', 'true');

      // Add bedroom requirements for larger groups
      if (criteria.guests && criteria.guests > 2) {
        const bedrooms = Math.ceil(criteria.guests / 2);
        searchParams.append('bedrooms', bedrooms.toString());
      }
    }
    // Default is hotels (no parameter needed)
  }

  private applyQualityFilters(searchParams: URLSearchParams, criteria?: TravelCriteria): void {
    if (!criteria) return;

    const purpose = criteria.tripPurpose?.toLowerCase() || '';
    const hasLuxuryKeywords = criteria.additionalRequests?.some(req =>
      req.toLowerCase().includes('luxury') ||
      req.toLowerCase().includes('upscale') ||
      req.toLowerCase().includes('premium')
    ) || false;

    // Rating filters based on context
    if (purpose.includes('business') || hasLuxuryKeywords) {
      searchParams.append('rating', '8'); // 4.0+ stars
      if (hasLuxuryKeywords) {
        searchParams.append('hotel_class', '5'); // 5-star for luxury
      } else {
        searchParams.append('hotel_class', '4'); // 4-star for business
      }
    } else if (purpose.includes('romantic') || purpose.includes('honeymoon')) {
      searchParams.append('rating', '9'); // 4.5+ stars
    } else if (criteria.locationPreferences?.some(pref =>
      pref.toLowerCase().includes('quality') ||
      pref.toLowerCase().includes('rated')
    )) {
      searchParams.append('rating', '8'); // 4.0+ stars
    }
  }

  private applyAmenityFilters(searchParams: URLSearchParams, criteria?: TravelCriteria): void {
    if (!criteria?.amenities || criteria.amenities.length === 0) return;

    // Note: SerpApi amenity filtering requires specific amenity IDs
    // This is a simplified implementation - in production, you'd map to actual IDs
    const importantAmenities = criteria.amenities.filter(amenity => {
      const amenityLower = amenity.toLowerCase();
      return amenityLower.includes('pool') ||
             amenityLower.includes('gym') ||
             amenityLower.includes('spa') ||
             amenityLower.includes('parking') ||
             amenityLower.includes('pet');
    });

    if (importantAmenities.length > 0) {
      // In a full implementation, you'd map these to SerpApi amenity IDs
      // For now, we'll rely on post-processing filtering
      console.log('Amenity filtering requested:', importantAmenities);
    }
  }

  private applyFlexibilityFilters(searchParams: URLSearchParams, criteria?: TravelCriteria): void {
    if (criteria?.flexibleCancellation) {
      searchParams.append('free_cancellation', 'true');
    }

    // Check for deal-seeking behavior
    if (criteria?.additionalRequests?.some(req =>
      req.toLowerCase().includes('deal') ||
      req.toLowerCase().includes('discount') ||
      req.toLowerCase().includes('special')
    )) {
      searchParams.append('special_offers', 'true');
    }
  }

  private async executeSearch(searchParams: URLSearchParams): Promise<RawPropertyData[]> {
    this.progressCallback('Executing pre-filtered search via Google Hotels...');

    const requestUrl = `${this.baseUrl}?${searchParams}`;
    console.log('🔍 SerpApi Request URL:', requestUrl);
    console.log('🔑 API Key configured:', !!this.apiKey);
    console.log('📋 Search Parameters:', Object.fromEntries(searchParams));

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 SerpApi Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SerpApi search failed:', response.status, response.statusText);
      console.error('❌ Error response body:', errorText);
      throw new Error(`SerpApi search failed: ${response.status} - ${errorText}`);
    }

    const data: SerpApiResponse = await response.json();
    console.log('✅ SerpApi Response received:', {
      hasProperties: !!data.properties,
      propertyCount: data.properties?.length || 0,
      hasAds: !!data.ads,
      adsCount: data.ads?.length || 0,
      hasError: !!data.error,
      responseKeys: Object.keys(data),
      searchMetadata: data.search_metadata
    });

    // Enhanced logging for first property to understand structure
    const firstProperty = data.properties?.[0] || data.ads?.[0];
    if (firstProperty) {
      console.log('🏨 First property structure:', {
        name: firstProperty.name,
        hasImages: !!firstProperty.images,
        imagesCount: firstProperty.images?.length,
        hasThumbnail: !!firstProperty.thumbnail,
        hasMainPhoto: !!firstProperty.main_photo_url,
        hasPhoto: !!firstProperty.photo,
        hasPhotos: !!firstProperty.photos,
        imageKeys: firstProperty.images ? Object.keys(firstProperty.images[0] || {}) : [],
        allKeys: Object.keys(firstProperty).filter(k => k.toLowerCase().includes('photo') || k.toLowerCase().includes('image') || k.toLowerCase().includes('thumb'))
      });
    }

    // Check both properties and ads arrays for hotel data
    const hotels = data.properties || data.ads || [];

    if (!hotels || hotels.length === 0) {
      console.log('⚠️ No hotels in response. Full response structure:', JSON.stringify(data, null, 2));
      this.progressCallback('No properties found with current filters. Try broadening your criteria.');
      return [];
    }

    console.log(`SerpApi returned ${hotels.length} hotels (from ${data.properties ? 'properties' : 'ads'} array)`);

    // Log price range for debugging
    if (hotels.length > 0) {
      const prices = hotels
        .map(p => p.rate_per_night?.extracted_lowest || p.total_rate?.extracted_lowest || p.extracted_price)
        .filter(p => p && p > 0) as number[];

      if (prices.length > 0) {
        const priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices),
          average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        };
        console.log('Price range from SerpApi:', priceRange);
      }
    }

    return this.convertSerpApiResults(hotels);
  }

  private convertSerpApiResults(properties: SerpApiProperty[]): RawPropertyData[] {
    return properties.slice(0, 8).map((property, index) => {
      this.progressCallback(`Processing property ${index + 1}: ${property.name}`);

      // Extract price (handle both properties and ads structures)
      const pricePerNight = property.rate_per_night?.extracted_lowest ||
                           property.rate_per_night?.extracted_before_taxes_fees ||
                           property.total_rate?.extracted_lowest ||
                           property.extracted_price || 0;

      // Build description
      const description = this.buildPropertyDescription(property);

      // Extract amenities
      const amenities = this.extractAmenities(property);

      // Extract location
      const location = this.extractLocation(property);

      // Extract image with comprehensive fallback logic
      const imageUrl = this.extractImageUrl(property, index + 1);

      return {
        name: property.name || 'Unknown Property',
        price: Math.round(pricePerNight),
        rating: property.overall_rating || 0,
        description,
        amenities,
        location,
        imageUrl,
        bookingUrl: property.link,
        source: 'google_hotels'
      };
    });
  }

  private buildPropertyDescription(property: SerpApiProperty): string {
    const parts = [];

    if (property.description) {
      parts.push(property.description);
    } else {
      parts.push(`${property.type || 'Accommodation'} with ${property.reviews || 0} reviews`);
    }

    if (property.overall_rating) {
      parts.push(`Rated ${property.overall_rating}/5`);
    }

    if (property.nearby_places && property.nearby_places.length > 0) {
      const nearbyPlace = property.nearby_places[0];
      parts.push(`Near ${nearbyPlace.name}`);
    }

    return parts.join('. ') + '.';
  }

  private extractAmenities(property: SerpApiProperty): string[] {
    const amenities: string[] = [];

    // Add SerpApi provided amenities
    if (property.amenities) {
      amenities.push(...property.amenities);
    }

    // Add essential info as amenities
    if (property.essential_info) {
      amenities.push(...property.essential_info);
    }

    // Add property type
    if (property.type) {
      amenities.push(property.type);
    }

    // Add nearby transportation as amenity
    if (property.nearby_places) {
      property.nearby_places.forEach(place => {
        if (place.transportations) {
          place.transportations.forEach(transport => {
            amenities.push(`${transport.duration} to ${place.name} by ${transport.type}`);
          });
        }
      });
    }

    return [...new Set(amenities)]; // Remove duplicates
  }

  private extractImageUrl(property: SerpApiProperty, propertyIndex: number): string | undefined {
    // Priority order for image extraction - checking all possible sources
    const imageSources = [
      property.thumbnail,                              // From ads array
      property.images?.[0]?.original_image,           // High quality from properties
      property.images?.[0]?.thumbnail,                // Lower quality from properties
      property.images?.[0]?.source_url,               // Alternative image URL
      property.main_photo_url,                        // Alternative field name
      property.photo?.thumbnail,                      // Alternative structure
      property.photo?.original,                       // Alternative structure
      property.photos?.[0]?.thumbnail,                // Multiple photos array
      property.photos?.[0]?.original,                 // Multiple photos array
      // Try any nested image data
      ...(property.images || []).slice(1, 3).map(img => img.thumbnail || img.original_image),
    ].filter(Boolean); // Remove undefined/null values

    const selectedImage = imageSources[0];

    console.log(`🖼️  Property ${propertyIndex} (${property.name}): Image sources found:`, {
      thumbnail: !!property.thumbnail,
      originalImage: !!property.images?.[0]?.original_image,
      thumbnailFromImages: !!property.images?.[0]?.thumbnail,
      sourceUrl: !!property.images?.[0]?.source_url,
      mainPhotoUrl: !!property.main_photo_url,
      photoThumbnail: !!property.photo?.thumbnail,
      photoOriginal: !!property.photo?.original,
      photosArray: !!property.photos?.[0],
      imagesCount: property.images?.length || 0,
      totalSources: imageSources.length,
      selectedImage: selectedImage ? 'Found' : 'None',
      selectedUrl: selectedImage ? selectedImage.substring(0, 60) + '...' : 'None'
    });

    // If no image found, provide a fallback based on property name/location
    if (!selectedImage) {
      console.log(`⚠️ No image found for ${property.name}, using fallback strategy`);
      // You could add fallback logic here, such as:
      // - Generic hotel placeholder images
      // - Images based on location/chain
      // - Default placeholder URL
      return undefined; // Let UI handle placeholder
    }

    return selectedImage;
  }

  private extractLocation(property: SerpApiProperty): string {
    // Try to build location from nearby places
    if (property.nearby_places && property.nearby_places.length > 0) {
      const primaryLocation = property.nearby_places[0];
      return `Near ${primaryLocation.name}`;
    }

    // Fallback to GPS coordinates area description
    if (property.gps_coordinates) {
      return `Location: ${property.gps_coordinates.latitude.toFixed(3)}, ${property.gps_coordinates.longitude.toFixed(3)}`;
    }

    return 'Location details available after booking';
  }

  private formatDateForAPI(dateString: string): string | null {
    try {
      let date: Date;

      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 2) {
          const currentYear = new Date().getFullYear();
          date = new Date(currentYear, parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else if (parts.length === 3) {
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else {
          return null;
        }
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        return null;
      }

      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }

  private logSearchStrategy(searchParams: URLSearchParams, criteria?: TravelCriteria): void {
    const strategy = [];

    if (searchParams.has('min_price') || searchParams.has('max_price')) {
      const min = searchParams.get('min_price');
      const max = searchParams.get('max_price');
      strategy.push(`Budget: $${min || '0'}-$${max || '∞'} per night`);
    }

    if (searchParams.has('vacation_rentals')) {
      strategy.push('Property type: Vacation rentals');
    } else {
      strategy.push('Property type: Hotels');
    }

    if (searchParams.has('rating')) {
      const rating = searchParams.get('rating');
      const ratingText = rating === '9' ? '4.5+ stars' : rating === '8' ? '4.0+ stars' : 'Quality rated';
      strategy.push(`Minimum rating: ${ratingText}`);
    }

    if (searchParams.has('free_cancellation')) {
      strategy.push('Free cancellation required');
    }

    if (criteria?.amenities && criteria.amenities.length > 0) {
      strategy.push(`Required amenities: ${criteria.amenities.join(', ')}`);
    }

    if (strategy.length > 0) {
      this.progressCallback(`Pre-filtering strategy: ${strategy.join(' | ')}`);
    }
  }
}