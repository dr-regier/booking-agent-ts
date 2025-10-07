# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production app with Turbopack
- `pnpm start` - Start production server
- `pnpm tsc --noEmit` - Run TypeScript compiler to check for type errors

## Code Quality

**IMPORTANT**: Always run `pnpm tsc --noEmit` after writing or modifying any code to ensure there are no TypeScript errors before considering the task complete.

## Package Manager

This project strictly uses **pnpm**. Do not use npm or yarn.

## Architecture

This is an AI-powered travel assistant application built with TypeScript and Next.js 15:

### Core Stack
- **Next.js 15** with App Router
- **AI SDK 5** with OpenAI GPT-4o-mini integration
- **SerpApi** for Google Hotels accommodation data
- **Vectorize** for historical weather data and climate insights
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/chat/` - AI chat endpoint for travel conversation
- `app/api/search-accommodations/` - Streaming accommodation search endpoint
- `components/ui/` - shadcn/ui components
- `components/ai-elements/` - AI chat interface components
- `lib/booking-automation/` - SerpApi integration and AI evaluation
- `lib/services/` - External API integrations (weather, vectorize)
- `lib/tools/` - AI tools for weather and historical climate data
- `lib/utils/` - Utility functions including travel criteria extraction

### AI Integration
- Uses AI SDK 5's `streamText()` for travel chat responses
- Configured for GPT-4o-mini via OpenAI provider
- `/api/chat` for natural language travel conversation and advice with weather tool integration
- `/api/search-accommodations` for streaming accommodation search with AI evaluation
- **Weather Tool**: Real-time weather information using OpenWeatherMap API with pattern-based detection
- **Vectorize Tool**: Historical weather patterns and climate data for Miami (contextual pattern matching)
- **Parallel tool execution**: Both weather tools can execute simultaneously when patterns match
- Requires `OPENAI_API_KEY`, `OPENWEATHERMAP_API_KEY`, and Vectorize credentials in `.env.local`

### Accommodation Search Integration
- **SerpApi Google Hotels** for real-time accommodation data
- **Smart pre-filtering** by budget, property type, rating, amenities
- **Dual-mode architecture**: Mock mode (default) and production mode
- **AI-powered evaluation** and ranking of properties
- Requires `SERPAPI_API_KEY` for production mode

### UI Components
- **shadcn/ui** configured with:
  - New York style
  - Neutral base color with CSS variables
  - Import aliases: `@/components`, `@/lib/utils`, `@/components/ui`
  - Lucide React for icons
- **AI Elements** from Vercel:
  - Pre-built components for AI applications
  - Located in `components/ai-elements/`
  - Key components: Message, PromptInput, FormattedMessage
  - Uses `UIMessage` type from AI SDK

### Adding Components
- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- AI Elements: `pnpm dlx ai-elements@latest` (adds all components)

## Environment Setup

Create `.env.local` with:
```
OPENAI_API_KEY=your_openai_api_key_here
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key_here
SERPAPI_API_KEY=your_serpapi_key_here
VECTORIZE_ACCESS_TOKEN=your_vectorize_access_token_here
VECTORIZE_ORG_ID=your_vectorize_organization_id_here
VECTORIZE_PIPELINE_ID=your_vectorize_pipeline_id_here
USE_REAL_BOOKING_SEARCH=true  # Optional: enables production mode
```

## Travel Assistant Features

This application provides AI-powered travel advice and accommodation search including:
- Destination suggestions and recommendations
- Travel tips and local insights
- **Real-time weather information with interactive weather widgets**
- **Historical climate data and seasonal weather patterns for Miami**
- Cultural information and travel planning guidance
- Best times to visit destinations with data-driven weather recommendations
- Smart accommodation search with SerpApi integration
- AI-powered property evaluation and ranking

### Weather & Climate Integration
- **Pattern-based detection**: Uses regex patterns to detect weather queries in user messages
- **Real-time weather**: Current conditions for any city via OpenWeatherMap API
- **Historical climate data**: Seasonal weather patterns and trends for Miami via Vectorize
- **Interactive weather cards**: Professional weather widgets displayed in chat conversation
- **Comprehensive weather data**: Temperature (°C/°F), humidity, wind speed, conditions, and weather icons
- **Temperature unit toggle**: Switch between Celsius and Fahrenheit in the UI
- **Parallel execution**: Weather and historical climate tools run simultaneously when both patterns detected
- **Error handling**: Graceful failure handling for invalid locations or API errors
- **Stream injection**: Weather data injected into AI response stream for seamless UX