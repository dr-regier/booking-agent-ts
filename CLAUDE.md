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
- **Next.js 15** with App Router and Turbopack
- **AI SDK 5** with OpenAI GPT-5 (o-series reasoning model)
- **Model Context Protocol (MCP)** with Firecrawl integration for web research
- **SerpApi** for Google Hotels accommodation data
- **Vectorize** for historical weather data and climate insights
- **OpenWeatherMap** for real-time weather data
- **Streamdown** for animated reasoning text streaming
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/api/chat/` - Agentic AI chat endpoint with multi-tool capabilities
- `app/api/search-accommodations/` - Streaming accommodation search endpoint
- `components/ui/` - shadcn/ui components
- `components/ai-elements/` - AI chat interface components
- `lib/mcp/` - Model Context Protocol integration (Firecrawl client)
- `lib/booking-automation/` - SerpApi integration and AI evaluation
- `lib/services/` - External API integrations (weather, vectorize)
- `lib/tools/` - AI tools for weather and historical climate data
- `lib/utils/` - Utility functions including travel criteria extraction

### AI Integration
- **Agentic Architecture**: AI autonomously decides which tools to use and in what order
- Uses AI SDK 5's `streamText()` for travel chat responses with multi-step reasoning
- Configured for **GPT-5 (o-series)** via OpenAI provider with reasoning capabilities
- **Multi-step reasoning display**: Separate collapsible accordions for each reasoning phase
- **Reasoning configuration**: `reasoningEffort: "low"`, `textVerbosity: "low"`, `reasoningSummary: "detailed"`
- `/api/chat` - Agentic endpoint with 7+ tools for autonomous research and planning
- `/api/search-accommodations` - Streaming accommodation search with AI evaluation

#### Available Tools
- **Weather Tool**: Real-time weather conditions for any city (OpenWeatherMap API)
- **Vectorize Tool**: Historical climate patterns and seasonal data for Miami
- **Firecrawl Tools** (via MCP):
  - `firecrawl_search` - Web search for destinations, hotels, restaurants, attractions
  - `firecrawl_scrape` - Extract detailed content from specific URLs
  - `firecrawl_crawl` - Deep crawl websites for comprehensive information
  - `firecrawl_extract` - Extract structured data using prompts or schemas
  - `firecrawl_deep_research` - Comprehensive research on complex topics
- **Parallel tool execution**: Multiple tools can execute simultaneously
- **Autonomous decision-making**: AI chooses which tools to call based on user needs

#### Required Environment Variables
- `OPENAI_API_KEY` - OpenAI GPT-5 (o-series) access
- `OPENWEATHERMAP_API_KEY` - Real-time weather data
- `FIRECRAWL_API_KEY` - Firecrawl MCP web research tools
- `VECTORIZE_ACCESS_TOKEN`, `VECTORIZE_ORG_ID`, `VECTORIZE_PIPELINE_ID` - Historical climate data
- `SERPAPI_API_KEY` - Google Hotels data (optional, for production mode)

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
  - Key components: Message, PromptInput, FormattedMessage, Reasoning
  - **Reasoning UI**: Collapsible accordions with `ReasoningTrigger` and `ReasoningContent`
  - **Streamdown integration**: Animated text streaming for reasoning steps
  - Uses `UIMessage` type from AI SDK

### Adding Components
- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- AI Elements: `pnpm dlx ai-elements@latest` (adds all components)

## Environment Setup

Create `.env.local` with:
```
# Required for AI chat
OPENAI_API_KEY=your_openai_api_key_here

# Required for weather and climate data
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key_here
VECTORIZE_ACCESS_TOKEN=your_vectorize_access_token_here
VECTORIZE_ORG_ID=your_vectorize_organization_id_here
VECTORIZE_PIPELINE_ID=your_vectorize_pipeline_id_here

# Required for web research (Firecrawl MCP)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Optional: for production accommodation search
SERPAPI_API_KEY=your_serpapi_key_here
USE_REAL_BOOKING_SEARCH=true
```

## Travel Assistant Features

### Agentic AI Travel Assistant
This application features an **autonomous AI agent** that makes intelligent decisions about which tools to use and when:

#### Core Capabilities
- **Autonomous multi-step reasoning**: GPT-5 (o-series) reasoning model with visible thought process
- **Interactive reasoning display**: Each reasoning step shown in separate collapsible accordions
- **Animated reasoning streams**: Real-time word-by-word display via Streamdown
- **Destination research and recommendations**: Web search and deep research via Firecrawl
- **Real-time weather information**: Current conditions for any city with interactive widgets
- **Historical climate intelligence**: Seasonal patterns and best-time-to-visit recommendations
- **Web research capabilities**: Search, scrape, crawl, and extract data from any website
- **Accommodation search**: Smart SerpApi integration with AI-powered evaluation
- **Cultural insights**: Research attractions, restaurants, activities, and local tips

#### Agentic Workflows
The AI autonomously combines tools for comprehensive answers:
- **"Visit Miami in March?"** → Historical weather + Current conditions
- **"Find hotels in Miami Beach"** → Web search + Scrape details + Extract pricing
- **"Plan Miami trip"** → Climate data + Search attractions + Search restaurants + Research activities
- **"Research Art Deco history"** → Deep research + Crawl tourism sites

#### Weather & Climate Integration
- **Real-time weather**: Current conditions via OpenWeatherMap API
- **Historical climate data**: Seasonal patterns for Miami via Vectorize
- **Interactive weather widgets**: Professional cards embedded in chat
- **Temperature unit toggle**: Switch between °C/°F
- **Parallel execution**: Multiple weather tools run simultaneously
- **Graceful error handling**: Continues conversation if tools fail

#### Web Research Integration (Firecrawl MCP)
- **Search**: Find hotels, restaurants, attractions across the web
- **Scrape**: Extract detailed content from specific URLs
- **Crawl**: Deep dive into websites for comprehensive information
- **Extract**: Get structured data (pricing, ratings, availability)
- **Deep Research**: Conduct thorough research on complex topics
- **SSE Transport**: Real-time streaming via Model Context Protocol