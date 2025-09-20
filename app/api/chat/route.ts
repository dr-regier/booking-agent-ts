import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, messageHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Limit message history to last 10 messages for performance
    const recentHistory = messageHistory.slice(-10);

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.7,
      system: `You are an Accommodation Booking Agent that helps users find and book accommodations efficiently. Your role is to collect booking requirements and preferences through focused conversation.

**Required booking information (5 core criteria):**
- Destination (city/region)
- Check-in date
- Check-out date  
- Number of guests
- Budget per night

**Enhanced preferences to capture:**
- Amenities (wifi, gym, AC, pool, parking, etc.)
- Property types (hotel, apartment, resort, etc.)
- Location preferences (downtown, beach, quiet area, etc.)
- Special requirements or exclusions
- Room preferences, accessibility needs, etc.

**Response guidelines:**
- Use numbered lists and bullet points for clarity
- Keep responses concise but complete (aim for efficiency)
- Ask 1-2 focused follow-up questions per response
- Assume users know their general destination area
- Structure information clearly for easy extraction

**Conversation flow:**
- Prioritize collecting the 5 core criteria first
- Once core criteria are gathered, collect enhanced preferences
- Indicate when you have sufficient information for accommodation search
- If users ask about non-accommodation topics, politely redirect to booking focus

**Formatting requirements:**
- Use proper spacing and organization
- Present options in clear lists when relevant
- Be professional but approachable
- Avoid overly lengthy responses

Once sufficient booking criteria are collected, the system will search for accommodations matching the user's requirements.`,
      messages: [
        ...recentHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ]
    });

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}