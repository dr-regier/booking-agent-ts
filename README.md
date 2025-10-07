# Agentic AI Travel Assistant

An intelligent **agentic travel assistant** that autonomously orchestrates multiple tools to provide comprehensive travel research and planning. The AI agent combines conversational intelligence with real-time weather data, historical climate insights, web research via Firecrawl MCP, and Google Hotels integration. Built with Next.js 15, TypeScript, AI SDK 5, and Model Context Protocol.

## 🚀 Key Features

### **Agentic AI Architecture**
- **Autonomous tool orchestration**: AI independently decides which tools to use and when
- **Multi-step reasoning**: Plans and executes complex research workflows
- **7+ integrated tools**: Weather, climate, web search, scraping, crawling, extraction, accommodation search
- **Parallel execution**: Multiple tools run simultaneously for efficient responses
- **Natural language understanding**: Parses complex travel requests into structured actions

### **Web Research Capabilities (Firecrawl MCP)**
- **Model Context Protocol integration**: Industry-standard AI tool protocol
- **Search**: Find hotels, restaurants, attractions across the web
- **Scrape**: Extract detailed content from specific URLs
- **Crawl**: Deep dive into websites for comprehensive information
- **Extract**: Get structured data (pricing, ratings, availability)
- **Deep Research**: Autonomous multi-step research on complex topics

### **Weather & Climate Intelligence**
- **Real-time weather**: Current conditions for any city via OpenWeatherMap
- **Historical climate data**: Seasonal patterns and trends for Miami via Vectorize
- **Interactive widgets**: Professional weather cards embedded in chat
- **Best-time-to-visit recommendations**: Data-driven travel timing advice

### **Smart Accommodation Search**
- **SerpApi Google Hotels** for real-time accommodation data
- **AI-powered evaluation** and ranking of properties
- **Smart pre-filtering** by budget, type, rating, amenities
- **Dual-mode architecture**: Mock mode (default) and production mode

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/dr-regier/booking-agent-ts.git
cd booking-agent-ts
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Setup
Create `.env.local` file with required API keys:
```bash
# Required for AI agent
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

### 4. Start Development
```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) to start chatting with the AI assistant.

## Testing Modes

This application supports two modes for accommodation search:

### Mock Mode (Default)
- Uses sample accommodation data for demonstration
- No real booking sites are accessed
- Perfect for testing and portfolio showcasing
- **Default behavior** - no additional setup required

### Production Mode
- Uses real SerpApi Google Hotels integration to search comprehensive accommodation data
- Provides live accommodation data from Google Hotels with smart pre-filtering
- **To enable:** Add both settings to your `.env.local` file:
```bash
USE_REAL_BOOKING_SEARCH=true
SERPAPI_API_KEY=your_serpapi_key_here
```
Then restart the development server with `pnpm dev`.

**Note:** Production mode requires a SerpApi key and may have response times of 3-8 seconds due to real-time data retrieval and AI evaluation.

## 🛠️ Technical Stack

### **Agentic AI & Tools**
- **AI SDK 5** with agentic architecture for autonomous tool orchestration
- **OpenAI GPT-4o-mini** for conversational intelligence and reasoning
- **Model Context Protocol (MCP)** for standardized AI tool integration
- **@modelcontextprotocol/sdk** for Firecrawl SSE transport

### **External APIs & Services**
- **Firecrawl MCP** for web search, scraping, crawling, extraction, and deep research
- **OpenWeatherMap** for real-time weather data
- **Vectorize** for historical climate patterns and seasonal data
- **SerpApi** for Google Hotels accommodation data

### **Frontend & Framework**
- **Next.js 15** with App Router and Turbopack
- **TypeScript** for type-safe development
- **Tailwind CSS v4** for responsive styling
- **shadcn/ui** component system for UI consistency

### **Development Tools**
- **pnpm** for efficient package management
- **Git** with feature branch workflows

## 🎯 Project Highlights

- **Agentic Architecture**: AI autonomously decides which tools to use for each query
- **Model Context Protocol**: Industry-standard integration with Firecrawl MCP server
- **Multi-Tool Orchestration**: Seamlessly combines 7+ tools for comprehensive answers
- **Parallel Execution**: Multiple API calls run simultaneously for optimal performance
- **Web Research Integration**: Real-time search, scraping, and data extraction capabilities
- **Weather Intelligence**: Current conditions + historical climate data for travel timing
- **Smart Accommodation Search**: AI-powered evaluation with intelligent pre-filtering
- **Production-Ready**: Comprehensive error handling and graceful degradation
- **Accessibility Compliant**: WCAG guidelines and screen reader support

## 📊 Learning Outcomes

This project demonstrates proficiency in:
- **Agentic AI systems** with autonomous decision-making and tool orchestration
- **Model Context Protocol (MCP)** for standardized AI tool integration
- Modern React ecosystem and Next.js best practices
- AI/ML integration with conversational interfaces
- **Multi-source API orchestration** across 4+ external services
- Real-time streaming with SSE transport
- Advanced prompt engineering for agent behavior
- User-centered design and accessibility standards
- Full-stack TypeScript development

## 🔗 Links

- **GitHub Repository**: [dr-regier/booking-agent-ts](https://github.com/dr-regier/booking-agent-ts)
- **Technologies**: Next.js 15, TypeScript, AI SDK 5, Model Context Protocol, Firecrawl, OpenWeatherMap, Vectorize, SerpApi, OpenAI GPT-4o-mini
- **YouTube Demo**: https://www.youtube.com/watch?v=etMSey1v4es
