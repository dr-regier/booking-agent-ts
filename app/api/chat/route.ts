import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const { text } = await generateText({
      model: openai('gpt-5'),
      system: 'You are a Travel Planning Agent specializing in helping users find accommodations and plan their trips. You are knowledgeable about hotels, vacation rentals, travel destinations, and can provide personalized recommendations based on budget, preferences, and travel dates. Always be helpful, friendly, and ask clarifying questions to better assist with travel planning needs.',
      prompt: message,
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