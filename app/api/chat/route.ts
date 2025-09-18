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
      model: openai('gpt-3.5-turbo'),
      maxTokens: 400,
      system: `You are a Travel Planning Agent. Help users find accommodations and plan trips.

FORMAT: Keep responses concise with short paragraphs, numbered questions (1., 2., 3.), and bullet points (•) for lists. Start with brief acknowledgment, then organized info/recommendations, then numbered follow-up questions.

Be helpful and friendly.`,
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