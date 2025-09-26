import { openai } from '@ai-sdk/openai';
import { streamText, generateText, UIMessage, convertToModelMessages } from 'ai';
import { NextRequest } from 'next/server';
import { weatherTool } from '@/lib/tools/weather-tool';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: UIMessage[] } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // First, check if user message mentions a destination and get weather if needed
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.parts?.[0]?.text || '';
    
    // Improved city detection - extract just the city name, not extra words
    const weatherPatterns = [
      /(?:weather in|what's.*weather.*in|how's.*weather.*in|weather for)\s+([A-Za-z\s,]+?)(?:\s+(?:right now|now|today|currently)|\?|$)/i,
      /^(?:what's the weather in|how's the weather in|weather in)\s+([A-Za-z\s,]+?)(?:\s+(?:right now|now|today|currently)|\?|$)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s*,\s*[A-Z][a-z]+)?\s+weather\b/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s*,\s*[A-Z][a-z]+)?(?:\s+(?:right now|now|today|currently))?\?*$/i
    ];
    
    let cityMentioned = null;
    for (const pattern of weatherPatterns) {
      const match = pattern.exec(userMessage.trim());
      if (match && match[1]) {
        let city = match[1].trim();
        // Clean up the city name - remove common time indicators
        city = city.replace(/\s+(right now|now|today|currently)$/i, '').trim();
        // Basic validation - city should be at least 2 chars and not common greetings
        if (city.length >= 2 && !['hello', 'hi', 'hey', 'thanks', 'thank'].includes(city.toLowerCase())) {
          cityMentioned = [null, city]; // Format to match original structure
          break;
        }
      }
    }

    let weatherData = null;
    if (cityMentioned) {
      try {
        const city = cityMentioned[1] || cityMentioned[0];
        // console.log('Detected city mention:', city); // Debug disabled
        const result = await weatherTool.execute({ city: city.trim() });
        if (result.success) {
          weatherData = result.data;
          // console.log('Weather data obtained:', weatherData); // Debug disabled
        }
      } catch (error) {
        // console.log('Weather lookup failed, continuing without weather data'); // Debug disabled
      }
    }

    // Create system prompt with weather context if available
    let systemPrompt = `You are a friendly and professional Travel Assistant. Your role is to help users with all aspects of travel planning - from destination recommendations and travel advice to finding perfect accommodations when they're ready to book.

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
1. **Travel Advice & Recommendations**: Help with destination suggestions, travel timing, local insights, and general travel questions
2. **Weather Information**: You have access to current weather conditions for destinations
3. **Accommodation Search**: When users are ready to book, help find perfect places to stay by understanding their destination, dates, group size, budget, and preferences`;

    if (weatherData) {
      systemPrompt += `

**Current Weather Context:**
The user asked about ${weatherData.location} and the current weather is:
- Temperature: ${weatherData.temperature}°C (${weatherData.temperatureFahrenheit}°F)
- Conditions: ${weatherData.description}
- Humidity: ${weatherData.humidity}%
- Wind: ${weatherData.windSpeed}

Incorporate this weather information naturally into your response to provide helpful travel context.`;
    }

    systemPrompt += `

**Instructions:**
- Always provide helpful, conversational travel advice
- If weather data is available, incorporate it naturally into your response
- Never mention technical details or show raw data
- Keep responses engaging and travel-focused
- Ask follow-up questions to help with travel planning

Remember: You're a comprehensive travel professional who makes destination planning enjoyable and stress-free!`;

    const result = streamText({
      model: openai('gpt-4o-mini'),
      temperature: 0.7,
      system: systemPrompt,
      messages: convertToModelMessages(messages)
    });

    // If we have weather data, we need to inject it into the stream
    if (weatherData) {
      // Get the original stream response
      const originalResponse = result.toUIMessageStreamResponse();
      
      // Create a new readable stream that includes weather data
      const stream = new ReadableStream({
        async start(controller) {
          const reader = originalResponse.body?.getReader();
          if (!reader) return;
          
          const encoder = new TextEncoder();
          let sentWeatherData = false;
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Send weather data just before closing the stream
                if (!sentWeatherData) {
                  const weatherEvent = `data: ${JSON.stringify({
                    type: 'tool-output-available',
                    toolCallId: 'weather-' + Date.now(),
                    output: {
                      success: true,
                      data: weatherData
                    }
                  })}\n\n`;
                  controller.enqueue(encoder.encode(weatherEvent));
                }
                break;
              }
              
              // Forward the original chunk
              controller.enqueue(value);
              
              // Check if this is a good time to inject weather data
              // (after text content but before finish)
              const chunk = new TextDecoder().decode(value);
              if (!sentWeatherData && chunk.includes('"type":"text-end"')) {
                const weatherEvent = `data: ${JSON.stringify({
                  type: 'tool-output-available',
                  toolCallId: 'weather-' + Date.now(),
                  output: {
                    success: true,
                    data: weatherData
                  }
                })}\n\n`;
                controller.enqueue(encoder.encode(weatherEvent));
                sentWeatherData = true;
              }
            }
          } catch (error) {
            console.error('Stream processing error:', error);
          } finally {
            controller.close();
          }
        }
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return result.toUIMessageStreamResponse();
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