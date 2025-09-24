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

This is an AI-powered travel booking assistant application built with TypeScript and Next.js 15:

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
- `lib/booking-automation/` - SerpApi integration and AI evaluation
- `lib/utils/` - Utility functions including travel criteria extraction

### AI Integration
- Uses AI SDK 5's `generateText()` for chat and property evaluation
- Configured for GPT-4o-mini via OpenAI provider
- `/api/chat` for natural language travel conversation
- `/api/search-accommodations` for streaming accommodation search with AI evaluation
- Requires `OPENAI_API_KEY` in `.env.local`

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
  - Key components: Conversation, Message, PromptInput
  - Uses `UIMessage` type from AI SDK

### Adding Components
- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- AI Elements: `pnpm dlx ai-elements@latest` (adds all components)

## Environment Setup

Create `.env.local` with:
```
OPENAI_API_KEY=your_openai_api_key_here
SERPAPI_API_KEY=your_serpapi_key_here
USE_REAL_BOOKING_SEARCH=true  # Optional: enables production mode
```