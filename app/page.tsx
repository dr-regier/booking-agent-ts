"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ThemeToggle } from "@/components/theme-toggle";
import { TravelSummary } from "@/components/travel-summary";
import { SearchAccommodations } from "@/components/search-accommodations";
import { SearchResults } from "@/components/search-results";
import type { TravelCriteria } from "@/lib/types/travel";
import { extractTravelCriteria, mergeTravelCriteria } from "@/lib/utils/travel-extractor";
import { extractEnhancedCriteria, mergeEnhancedCriteria } from "@/lib/utils/enhanced-extractor";
import { formatAIResponse } from "@/lib/utils/format-response";
import { FormattedMessage } from "@/components/formatted-message";
import { WeatherWidget } from "@/components/weather-widget";
import type { WeatherToolResult } from "@/lib/tools/weather-tool";

interface AccommodationResult {
  id: string;
  name: string;
  price: number;
  rating: number;
  description: string;
  amenities: string[];
  location: string;
}

interface ExtendedUIMessage extends UIMessage {
  toolResults?: {
    toolName: string;
    result: any;
  }[];
}

export default function Home() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [travelCriteria, setTravelCriteria] = useState<TravelCriteria>({});
  const [searchResults, setSearchResults] = useState<AccommodationResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep only the last 10 messages to reduce context size
  const limitedMessages = messages.slice(-10);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [limitedMessages, isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text: input }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Extract travel criteria from user input
    const extractedCriteria = extractTravelCriteria(input);
    const extractedEnhanced = extractEnhancedCriteria(input, extractedCriteria);

    setTravelCriteria((prev) => {
      const mergedBasic = mergeTravelCriteria(prev, extractedCriteria);
      return mergeEnhancedCriteria(mergedBasic, extractedEnhanced);
    });

    const currentInput = input;
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...limitedMessages, userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let streamedContent = "";
      let toolResults: {toolName: string; result: any}[] = [];

      // Create an assistant message for streaming
      const assistantMessage: ExtendedUIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: "" }],
        toolResults: [],
      };

      setLastMessageId(assistantMessage.id);
      setMessages((prev) => [...prev, assistantMessage as UIMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          

          // Split chunk by lines to handle streaming data
          const lines = chunk.split('\n').filter(line => line.trim());
          

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              // Text content
              const jsonStr = line.substring(6); // Remove "data: " prefix
              try {
                if (jsonStr === '[DONE]') {
                  break;
                }
                const data = JSON.parse(jsonStr);
                    // console.log('Streaming event received:', data); // Debug disabled
                if (data.type === 'text-delta' && data.delta) {
                  streamedContent += data.delta;
                } else if (data.type === 'tool-output-available') {
                  // Handle tool output events
                  // console.log('Tool output event full details:', JSON.stringify(data, null, 2)); // Debug disabled
                  // Check if this is a weather tool result by looking at the output structure
                  if (data.output && (data.output.success !== undefined || data.output.location || data.output.data)) {
                    // console.log('Weather tool output detected:', data.output); // Debug disabled
                    toolResults.push({
                      toolName: 'getWeather',
                      result: data.output
                    });
                  }
                }
              } catch (e) {
                console.debug('Could not parse streaming data:', line, e);
              }
            } else if (line.startsWith('c:')) {
              // Tool calls - parse and handle tool results
              try {
                const toolData = JSON.parse(line.substring(2));
                if (toolData.toolName === 'getWeather' && toolData.result) {
                  toolResults.push({
                    toolName: 'getWeather',
                    result: toolData.result
                  });
                }
              } catch (e) {
                // Ignore malformed tool data
                console.debug('Could not parse tool data:', line);
              }
            }
          }

          
          // Update the assistant message with the streamed content and tool results
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? {
                    ...msg,
                    parts: [{ type: "text", text: formatAIResponse(streamedContent) }],
                    toolResults: toolResults
                  } as UIMessage
                : msg
            )
          );
        }
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        throw new Error("Failed to read response stream");
      }

    } catch (fetchError) {
      console.error("Error:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to get response");

      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
      setInput(currentInput); // Restore input
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (error && input) {
      setError(null);
      handleSubmit(new Event('submit') as any);
    }
  };

  // Dynamic greeting based on time of day
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! Ready to plan your next adventure?";
    if (hour < 17) return "Good afternoon! Let's explore the world together.";
    return "Good evening! Where shall we discover tonight?";
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 flex max-w-7xl mx-auto gap-4 p-4 animate-in fade-in duration-700">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full bg-white/95 rounded-3xl shadow-2xl border border-gray-200/50 animate-in slide-in-from-left duration-500 delay-100">
        {/* Enhanced Travel-Themed Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 border-b border-blue-500/20 p-4 flex items-center justify-between flex-shrink-0 rounded-t-3xl relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-20 animate-float">
              ✈️
            </div>
            <div className="absolute top-8 right-32 animate-float-delayed">
              🧳
            </div>
            <div className="absolute bottom-6 left-1/3 animate-float-slow">
              🧭
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-xl font-bold text-white drop-shadow-lg transition-all duration-300 hover:text-blue-100 cursor-default">
              Travel Assistant
            </h1>
            <p className="text-blue-100 text-xs font-medium mt-0.5">
              {getTimeBasedGreeting()}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Chat content container with fixed height */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-2 space-y-3">
              {/* Show search results if they exist */}
              {searchResults.length > 0 ? (
                <SearchResults
                  results={searchResults}
                  onClear={() => setSearchResults([])}
                />
              ) : (
                <>
                  {limitedMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200 space-y-6 max-w-lg mx-auto">
                        <div className="text-4xl text-center">🌍</div>
                        <h3 className="font-semibold text-xl text-gray-800 text-center">Welcome to your Travel Assistant!</h3>
                        <p className="text-gray-600 text-sm leading-relaxed text-center">
                          I'm here to help you explore the world! Ask me about destinations, travel tips, weather conditions,
                          or when you're ready, I'll help you find the perfect accommodations.
                          Let's plan your perfect adventure together!
                        </p>
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Travel Advice
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            Live Weather
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                            Accommodation Search
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Local Insights
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    limitedMessages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-${message.role === 'user' ? 'right' : 'left'} duration-300`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className={`max-w-2xl space-y-2`}>
                          <div className={`rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                            message.role === 'user'
                              ? 'bg-blue-500 border-blue-400 text-white hover:bg-blue-600'
                              : 'bg-white/95 border-gray-200 text-gray-800 hover:bg-white'
                          } p-4 group`}>
                            <FormattedMessage
                              content={message.parts.find(part => part.type === 'text')?.text || ''}
                              role={message.role}
                              isNew={message.role === 'assistant' && message.id === lastMessageId}
                            />
                          </div>

                          {/* Render weather widgets for tool results */}
                          {message.role === 'assistant' && (message as ExtendedUIMessage).toolResults?.map((toolResult, index) => (
                            toolResult.toolName === 'getWeather' && (
                              <WeatherWidget
                                key={`${message.id}-weather-${index}`}
                                result={toolResult.result as WeatherToolResult}
                              />
                            )
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {error && (
                    <div className="flex justify-start">
                      <div className="max-w-2xl bg-red-50 border-red-200 text-red-800 rounded-2xl shadow-lg border p-4 space-y-3">
                        <p className="text-sm font-medium">Sorry, I encountered an error:</p>
                        <p className="text-xs text-red-600">{error}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRetry}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area pinned to bottom */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 rounded-b-3xl">
            <div className="max-w-4xl mx-auto p-4">
              <form onSubmit={handleSubmit} className="flex items-center bg-white rounded-2xl shadow-lg border-2 border-gray-300 transition-all duration-200 hover:shadow-xl travel-input-container pl-4 pr-2 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me about destinations, travel tips, or help finding accommodations..."
                  className="flex-1 min-h-0 h-10 resize-none border-none p-0 shadow-none outline-none ring-0 focus-visible:ring-0 bg-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex-shrink-0 ml-2 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Travel summary sidebar - fixed height with scroll */}
      <div className="w-72 h-full bg-white/95 rounded-3xl shadow-2xl border border-gray-200/50 p-4 space-y-4 overflow-y-auto animate-in slide-in-from-right duration-500 delay-200">
        <div className="animate-in fade-in duration-500 delay-300">
          <TravelSummary criteria={travelCriteria} />
        </div>

        <div className="animate-in fade-in duration-500 delay-400">
          <SearchAccommodations
            criteria={travelCriteria}
            onSearchResults={setSearchResults}
          />
        </div>
      </div>
    </div>
  );
}