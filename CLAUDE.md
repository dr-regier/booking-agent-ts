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
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/chat/` - AI chat endpoint for travel conversation
- `app/api/search-accommodations/` - Streaming accommodation search endpoint
- `components/ui/` - shadcn/ui components
- `components/ai-elements/` - AI chat interface components
- `lib/booking-automation/` - SerpApi integration and AI evaluation
- `lib/utils/` - Utility functions including travel criteria extraction

### AI Integration
- Uses AI SDK 5's `streamText()` for travel chat responses with tool calling support
- Configured for GPT-4o-mini via OpenAI provider
- `/api/chat` for natural language travel conversation and advice with weather tool integration
- `/api/search-accommodations` for streaming accommodation search with AI evaluation
- **Weather Tool**: Real-time weather information using OpenWeatherMap API
- Requires `OPENAI_API_KEY` and `OPENWEATHERMAP_API_KEY` in `.env.local`

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
USE_REAL_BOOKING_SEARCH=true  # Optional: enables production mode
```

## Travel Assistant Features

This application provides AI-powered travel advice and accommodation search including:
- Destination suggestions and recommendations
- Travel tips and local insights
- **Real-time weather information with interactive weather widgets**
- Cultural information and travel planning guidance
- Best times to visit various destinations
- Smart accommodation search with SerpApi integration
- AI-powered property evaluation and ranking

### Weather Widget Features
- **Automatic weather checking**: AI automatically fetches weather when destinations are mentioned
- **Interactive weather cards**: Professional weather widgets display in chat conversation
- **Comprehensive weather data**: Temperature, humidity, wind speed, conditions, and weather icons
- **Temperature unit toggle**: Switch between Celsius and Fahrenheit
- **Error handling**: Graceful handling of invalid locations and API failures
- **Caching**: 5-minute cache to prevent duplicate API calls and optimize performance