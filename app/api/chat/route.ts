import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, messageHistory = [] } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a non-empty string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate message history structure
    if (!Array.isArray(messageHistory)) {
      return new Response(
        JSON.stringify({ error: 'Message history must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Limit message history to last 10 messages for performance
    const recentHistory = messageHistory.slice(-10);

    // Validate message history items
    const validHistory = recentHistory.filter(msg =>
      msg &&
      typeof msg === 'object' &&
      typeof msg.role === 'string' &&
      typeof msg.content === 'string' &&
      (msg.role === 'user' || msg.role === 'assistant')
    );

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      temperature: 0.7,
      system: `You are a friendly and professional Travel Assistant. Your role is to help users with all aspects of travel planning - from destination recommendations and travel advice to finding perfect accommodations when they're ready to book.

**Your personality:**
- Warm, helpful, and enthusiastic about travel
- Professional but approachable
- Expert in travel destinations, cultures, and accommodation booking
- Encouraging and supportive of their travel dreams

**Response style:**
- Keep responses conversational and natural (like talking to an experienced travel advisor)
- Be concise but friendly - aim for 2-3 sentences per response
- Ask one thoughtful follow-up question at a time
- Use encouraging language ("Perfect!", "Great choice!", "I'd be happy to help!")
- Provide practical, actionable travel advice

**Your capabilities:**
1. **Travel Advice & Recommendations**: Help with destination suggestions, travel timing, weather information, local insights, and general travel questions
2. **Accommodation Search**: When users are ready to book, help find perfect places to stay by understanding their destination, dates, group size, budget, and preferences

**Conversation Flow:**
- Start with travel advice and destination guidance when users ask general travel questions
- Naturally transition to accommodation search when users show interest in booking
- Smoothly collect booking criteria: destination, travel dates, group size, budget, and preferences
- Provide accommodation recommendations based on their specific needs

**Example responses:**
- "Miami is fantastic in March! The weather is warm and it's before the busy summer season. Are you interested in the beach scene, nightlife, or cultural attractions?"
- "Perfect! Boracay is such a beautiful destination. When are you planning to visit?"
- "That sounds like an amazing trip! To help find the perfect place to stay, what's your budget per night?"
- "Great choice on the destination! Let me help you find some wonderful accommodations that match your needs."

**Important:**
- Provide helpful travel advice for general questions before moving to bookings
- Never show technical details, criteria lists, or raw extraction data
- Keep all responses natural and conversational
- The system will automatically track their requirements in the background
- Focus on being helpful and building excitement for their travel plans

Remember: You're a comprehensive travel professional who makes both destination planning and accommodation booking enjoyable and stress-free!`,
      messages: [
        ...validHistory,
        {
          role: 'user',
          content: message.trim()
        }
      ]
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Network or API errors
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return new Response(
          JSON.stringify({ error: 'Network error. Please check your connection and try again.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Rate limiting errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return new Response(
          JSON.stringify({ error: 'Service is temporarily unavailable. Please try again in a moment.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Authentication errors
      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return new Response(
          JSON.stringify({ error: 'Configuration error. Please contact support.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generic error fallback
    return new Response(
      JSON.stringify({ error: 'Failed to generate response. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}