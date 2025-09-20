"use client";

import { useState, useEffect, useRef } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageAvatar,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import type { UIMessage } from "ai";
import { ThemeToggle } from "@/components/theme-toggle";
import { TravelSummary } from "@/components/travel-summary";
import { SearchAccommodations, SearchResults } from "@/components/search-accommodations";
import type { TravelCriteria } from "@/lib/types/travel";
import { extractTravelCriteria, mergeTravelCriteria } from "@/lib/utils/travel-extractor";
import { extractEnhancedCriteria, mergeEnhancedCriteria } from "@/lib/utils/enhanced-extractor";
import { formatAIResponse } from "@/lib/utils/format-response";
import { FormattedMessage } from "@/components/formatted-message";

interface AccommodationResult {
  id: string;
  name: string;
  price: number;
  rating: number;
  description: string;
  amenities: string[];
  location: string;
}

export default function Home() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  // Keep only the last 10 messages to reduce context size
  const limitedMessages = messages.slice(-10);
  const [isLoading, setIsLoading] = useState(false);
  const [travelCriteria, setTravelCriteria] = useState<TravelCriteria>({});
  const [searchResults, setSearchResults] = useState<AccommodationResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [limitedMessages, isLoading]);


  const handleSubmit = async (
    message: { text?: string; files?: any[] },
    event: React.FormEvent
  ) => {
    if (!message.text?.trim() || isLoading) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message.text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Reset form immediately after adding message
    (event.target as HTMLFormElement).reset();

    // Extract travel criteria from user message
    const extractedCriteria = extractTravelCriteria(message.text);
    const extractedEnhanced = extractEnhancedCriteria(message.text, extractedCriteria);

    setTravelCriteria((prev) => {
      const mergedBasic = mergeTravelCriteria(prev, extractedCriteria);
      return mergeEnhancedCriteria(mergedBasic, extractedEnhanced);
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.text,
          messageHistory: limitedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        const assistantMessage: UIMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: formatAIResponse(data.response),
        };
        setLastMessageId(assistantMessage.id);
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Error:", error);
      let errorContent = "Sorry, I encountered an error. Please try again.";

      if (error instanceof Error && error.name === 'AbortError') {
        errorContent = "The request timed out. Please try again with a shorter message.";
      }

      const errorMessage: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic greeting based on time of day
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! Ready to plan your next adventure?";
    if (hour < 17) return "Good afternoon! Let's find your perfect getaway.";
    return "Good evening! Where shall we explore tonight?";
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 flex max-w-7xl mx-auto gap-6 p-6 animate-in fade-in duration-700">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full bg-white/95 rounded-3xl shadow-2xl border border-gray-200/50 animate-in slide-in-from-left duration-500 delay-100">
        {/* Enhanced Travel-Themed Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 border-b border-blue-500/20 p-6 flex items-center justify-between flex-shrink-0 rounded-t-3xl relative overflow-hidden">
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
            <h1 className="text-2xl font-bold text-white drop-shadow-lg transition-all duration-300 hover:text-blue-100 cursor-default mb-1">
              Travel Booking Assistant
            </h1>
            <p className="text-blue-100 text-sm font-medium">
              {getTimeBasedGreeting()}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Chat content container with fixed height */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-2 space-y-4">
              {limitedMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 space-y-4 max-w-md mx-auto">
                    <div className="text-3xl text-center">🌍</div>
                    <h3 className="font-semibold text-lg text-gray-800 text-center">Welcome to your Travel Assistant!</h3>
                    <p className="text-gray-600 text-sm leading-relaxed text-center">
                      I'm here to help you discover and book the perfect accommodations for your journey.
                      Share your destination, dates, number of guests, and budget to get started.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Personalized Search
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                        AI-Powered Recommendations
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
                    <div className={`max-w-2xl rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                      message.role === 'user'
                        ? 'bg-blue-500 border-blue-400 text-white hover:bg-blue-600'
                        : 'bg-white/95 border-gray-200 text-gray-800 hover:bg-white'
                    } p-4 group`}>
                      <FormattedMessage
                        content={message.content}
                        role={message.role}
                        isNew={message.role === 'assistant' && message.id === lastMessageId}
                      />
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl bg-white/95 border-gray-200 text-gray-800 rounded-2xl shadow-lg border p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse text-blue-600">Thinking...</div>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area pinned to bottom */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 rounded-b-3xl">
            <div className="max-w-4xl mx-auto p-4">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-300 p-3 transition-all duration-200 hover:shadow-xl travel-input-container">
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputBody>
                    <PromptInputTextarea
                      placeholder="Tell me about your travel plans..."
                    />
                    <PromptInputToolbar className="border-t border-gray-200 bg-white">
                      <div />
                      <PromptInputSubmit
                        status={isLoading ? "submitted" : undefined}
                        className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                      />
                    </PromptInputToolbar>
                  </PromptInputBody>
                </PromptInput>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Travel summary sidebar - fixed height with scroll */}
      <div className="w-80 h-full bg-white/95 rounded-3xl shadow-2xl border border-gray-200/50 p-6 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-500 delay-200">
        <div className="animate-in fade-in duration-500 delay-300">
          <TravelSummary criteria={travelCriteria} />
        </div>

        <div className="animate-in fade-in duration-500 delay-400">
          <SearchAccommodations
            criteria={travelCriteria}
            onSearchResults={setSearchResults}
          />
        </div>

        <div className="animate-in fade-in duration-500 delay-500">
          <SearchResults
            results={searchResults}
            onClear={() => setSearchResults([])}
          />
        </div>
      </div>
    </div>
  );
}
