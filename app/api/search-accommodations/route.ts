import { NextRequest } from 'next/server';
import type { TravelCriteria } from '@/lib/types/travel';
import { BookingAgent } from '@/lib/booking-automation';
import { AUTOMATION_CONFIG } from '@/lib/booking-automation/config';

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

const mockAccommodations: Record<string, AccommodationResult[]> = {
  'paris': [
    {
      id: '1',
      name: 'Hotel de Crillon',
      price: 450,
      rating: 4.8,
      description: 'Luxury hotel in the heart of Paris with stunning views of Place de la Concorde',
      amenities: ['wifi', 'spa', 'concierge', 'restaurant'],
      location: 'Place de la Concorde, Paris'
    },
    {
      id: '2',
      name: 'Le Marais Boutique Stay',
      price: 180,
      rating: 4.5,
      description: 'Charming boutique hotel in historic Le Marais district',
      amenities: ['wifi', 'breakfast', 'air conditioning'],
      location: 'Le Marais, Paris'
    },
    {
      id: '3',
      name: 'Modern Apartment near Louvre',
      price: 120,
      rating: 4.3,
      description: 'Spacious 2-bedroom apartment with kitchen, 5 minutes from Louvre',
      amenities: ['wifi', 'kitchen', 'family-friendly'],
      location: '1st Arrondissement, Paris'
    }
  ],
  'new york': [
    {
      id: '4',
      name: 'The Plaza Hotel',
      price: 580,
      rating: 4.7,
      description: 'Iconic luxury hotel overlooking Central Park',
      amenities: ['spa', 'restaurant', 'concierge', 'gym'],
      location: 'Fifth Avenue, New York'
    },
    {
      id: '5',
      name: 'Brooklyn Heights Loft',
      price: 220,
      rating: 4.4,
      description: 'Stylish loft with Manhattan skyline views',
      amenities: ['wifi', 'kitchen', 'balcony'],
      location: 'Brooklyn Heights, New York'
    }
  ],
  'tokyo': [
    {
      id: '6',
      name: 'Park Hyatt Tokyo',
      price: 650,
      rating: 4.9,
      description: 'Ultra-modern luxury hotel with city views and world-class service',
      amenities: ['spa', 'pool', 'restaurant', 'concierge'],
      location: 'Shinjuku, Tokyo'
    },
    {
      id: '7',
      name: 'Traditional Ryokan Experience',
      price: 280,
      rating: 4.6,
      description: 'Authentic Japanese inn with tatami rooms and onsen',
      amenities: ['traditional bath', 'restaurant', 'garden'],
      location: 'Asakusa, Tokyo'
    }
  ],
  'default': [
    {
      id: '8',
      name: 'Grand Central Hotel',
      price: 150,
      rating: 4.2,
      description: 'Comfortable hotel with modern amenities in city center',
      amenities: ['wifi', 'restaurant', 'parking'],
      location: 'City Center'
    },
    {
      id: '9',
      name: 'Cozy Downtown Apartment',
      price: 95,
      rating: 4.1,
      description: 'Well-equipped apartment perfect for travelers',
      amenities: ['wifi', 'kitchen', 'parking'],
      location: 'Downtown'
    }
  ]
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAccommodationsForDestination(destination?: string): AccommodationResult[] {
  if (!destination) return mockAccommodations.default;

  const key = destination.toLowerCase();
  for (const location of Object.keys(mockAccommodations)) {
    if (key.includes(location) || location.includes(key)) {
      return mockAccommodations[location];
    }
  }
  return mockAccommodations.default;
}

function filterByBudget(accommodations: AccommodationResult[], budget?: TravelCriteria['budget']): AccommodationResult[] {
  if (!budget) return accommodations;

  return accommodations.filter(acc => {
    if (budget.max && acc.price > budget.max) return false;
    if (budget.min && acc.price < budget.min) return false;
    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    const criteria: TravelCriteria = await request.json();

    // Check if we have sufficient criteria for real search
    const hasDestination = criteria.destination && criteria.destination.trim().length > 0;
    const shouldUseRealSearch = hasDestination && AUTOMATION_CONFIG.useRealSearch;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (shouldUseRealSearch) {
            // Use real Playwright automation
            const progressCallback = (message: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                message
              })}\n\n`));
            };

            const bookingAgent = new BookingAgent(progressCallback);
            const accommodations = await bookingAgent.searchAccommodations(criteria);

            // Send final results
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'results',
              accommodations,
              searchCriteria: criteria
            })}\n\n`));

          } else {
            // Use mock data for development/testing
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: 'Starting accommodation search (demo mode)...'
            })}\n\n`));

            await delay(800);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: 'Searching Booking.com...'
            })}\n\n`));

            await delay(1000);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: 'Searching Airbnb...'
            })}\n\n`));

            await delay(900);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: 'Searching Hotels.com...'
            })}\n\n`));

            await delay(700);

            // Get mock accommodations
            let accommodations = getAccommodationsForDestination(criteria.destination);
            accommodations = filterByBudget(accommodations, criteria.budget);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: `Analyzing ${accommodations.length} properties found...`
            })}\n\n`));

            await delay(1200);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: 'Generating personalized recommendations...'
            })}\n\n`));

            await delay(800);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              message: 'Finalizing search results...'
            })}\n\n`));

            await delay(500);

            // Send final results
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'results',
              accommodations,
              searchCriteria: criteria
            })}\n\n`));
          }

          // Signal completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete'
          })}\n\n`));

        } catch (error) {
          console.error('Search error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Search failed. Please try again.'
          })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Search API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to start search' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}