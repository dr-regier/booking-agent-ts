import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { NextRequest } from 'next/server';
import { weatherTool } from '@/lib/tools/weather-tool';
import { vectorizeTool } from '@/lib/tools/vectorize-tool';
import { getFirecrawlMCPClient } from '@/lib/mcp';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Travel Agent System Prompt
const TRAVEL_AGENT_SYSTEM_PROMPT = `You are an intelligent Travel Assistant Agent specializing in travel planning. You have access to multiple tools that you can use autonomously to help users with comprehensive travel research and planning.

**Your Available Tools:**

1. **weather** - Get current weather conditions and forecasts for any city
   - Use when: User asks about current weather, today's conditions, or short-term forecasts
   - Example queries: "What's the weather in Miami today?", "Current conditions in Paris"
   - Strip off the state from the city name if it's included.

2. **historicalWeather** - Get historical weather patterns and seasonal climate data for Miami.
   - Use when: User asks about best time to visit, seasonal patterns, typical weather by month.
   - Example queries: "When's the best time to visit Miami?", "What's Miami like in November?", "What is the hottest day of the month/year?", "What is the record high/low temperature?"
   - Note: Currently focused on Miami data.

3. **firecrawlTools** - Use Firecrawl tools when you need detailed content extraction or web scraping.

**Your Personality & Response Style:**
- Warm, helpful, and enthusiastic about travel
- Professional but approachable
- Expert in Miami travel and general destination planning
- Encouraging and supportive of travel dreams
- Keep responses conversational (like talking to an experienced travel advisor)
- Be concise but friendly - aim for 2-4 sentences per response
- Ask thoughtful follow-up questions to understand user needs better

**How to Use Your Tools:**
- **Make autonomous decisions** about which tools to call and in what order
- **Combine multiple tools** in a single conversation for comprehensive answers
- **Think step-by-step**: What information do I need? Which tools can provide it?
- **Examples of multi-tool workflows:**
  - "Visit Miami in March?" → Use historicalWeather for patterns + weather for current conditions
  - "Find hotels in Miami Beach" → Use firecrawl_search for hotels + firecrawl_scrape for details
  - "Plan a Miami trip" → Use historicalWeather + firecrawl_search (attractions) + firecrawl_search (restaurants)

**Important Guidelines:**
- Always use tools when they can provide better, more current information than your training data
- Don't mention technical details about tools to users - present information naturally
- If a tool fails, gracefully continue the conversation with available information
- Synthesize information from multiple tools into coherent, helpful responses

**Your Goal:**
Help users plan amazing trips by autonomously gathering real-time weather data, historical climate insights, and comprehensive web research about accommodations, attractions, dining, and activities.`;

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: UIMessage[] } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n🤖 ============================================');
    console.log('🤖 TRAVEL AGENT REQUEST RECEIVED');
    console.log('🤖 ============================================');

    // Initialize Firecrawl MCP client
    console.log('🚀 Initializing Firecrawl MCP client...');
    const firecrawlClient = getFirecrawlMCPClient();
    await firecrawlClient.connect();

    // Retrieve Firecrawl tools
    const firecrawlTools = await firecrawlClient.getTools();

    // Combine Firecrawl tools with existing weather and vectorize tools
    const allTools = {
      ...firecrawlTools,
      weather: weatherTool,
      historicalWeather: vectorizeTool,
    };

    console.log(`\n🔧 Agent has access to ${Object.keys(allTools).length} tools:`);
    console.log(`   - Firecrawl tools: ${Object.keys(firecrawlTools).join(', ')}`);
    console.log(`   - Weather tool: weather`);
    console.log(`   - Historical weather tool: historicalWeather`);

    // Wrap all tools with logging to track agent decisions
    const wrappedTools = Object.fromEntries(
      Object.entries(allTools).map(([toolName, toolDef]) => [
        toolName,
        {
          ...toolDef,
          execute: async (args: any, options: any) => {
            console.log(`\n🔧 ========================================`);
            console.log(`🔧 Tool Called: ${toolName}`);
            console.log(`🔧 ========================================`);
            console.log(`📥 Input:`, JSON.stringify(args, null, 2));

            const startTime = Date.now();
            try {
              const result = toolDef.execute ? await toolDef.execute(args, options) : null;
              const duration = Date.now() - startTime;

              console.log(`✅ Success (${duration}ms)`);
              console.log(`📤 Output:`, JSON.stringify(result, null, 2));

              return result;
            } catch (error) {
              const duration = Date.now() - startTime;
              console.log(`❌ Error (${duration}ms):`, error);
              throw error;
            }
          },
        },
      ])
    );

    console.log('\n🧠 Starting agentic conversation with multi-step reasoning...\n');

    // Stream text with agentic tool calling
    const result = streamText({
      model: openai('gpt-5'), 
      system: TRAVEL_AGENT_SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      tools: allTools,
      stopWhen: stepCountIs(10),
      // The agent can make multiple autonomous tool calls per turn
      // AI SDK 5.0 handles tool calling loops automatically
      // Note: GPT-4o-mini doesn't support reasoning options like GPT-o1
      // If you have access to GPT-o1, replace the model and add:
      providerOptions: {
         openai: {
           reasoning_effort: "low",
           textVerbosity: "low",
           reasoningSummary: "detailed",
         },
       },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('\n💥 ========================================');
    console.error('💥 TRAVEL AGENT ERROR');
    console.error('💥 ========================================');
    console.error('Error details:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // MCP connection errors
      if (error.message.includes('Firecrawl') || error.message.includes('MCP')) {
        console.error('⚠️ Firecrawl MCP connection error - agent will operate with limited tools');
        return new Response(
          JSON.stringify({ error: 'Web research tools temporarily unavailable. Weather and historical data still available.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

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
