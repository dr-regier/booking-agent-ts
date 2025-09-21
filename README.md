# Booking Agent - TypeScript Next.js AI Chat Application

A modern AI-powered chat application built with Next.js 15, TypeScript, AI SDK 5, shadcn/ui, and AI Elements for intelligent booking assistance and travel planning.

## Features

- **Clean Chat Interface** with GPT-4o-mini integration
- **AI Elements Components** (Conversation, Message, PromptInput)
- **shadcn/ui Design System** for modern, accessible UI
- **TypeScript Ready** with full type safety
- **Responsive Design** optimized for all devices
- **Real-time AI Responses** for booking assistance

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
Create `.env.local` file:
```bash
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
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
- Uses real Playwright automation to search actual booking sites
- Provides live accommodation data from Booking.com, Airbnb, etc.
- **To enable:** Add this line to your `.env.local` file:
```bash
USE_REAL_BOOKING_SEARCH=true
```
Then restart the development server with `pnpm dev`.

**Note:** Production mode requires additional dependencies and may have longer response times due to real-time web scraping.

## Repository
- **GitHub**: [dr-regier/booking-agent-ts](https://github.com/dr-regier/booking-agent-ts)

## Resources

- [Next.js 15](https://nextjs.org/) - React framework
- [AI SDK 5](https://ai-sdk.dev/) - AI integration toolkit
- [AI Elements](https://ai-sdk.dev/elements/overview) - Pre-built AI components
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
