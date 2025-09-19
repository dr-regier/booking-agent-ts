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

  // Force textarea styling after mount
  useEffect(() => {
    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.setProperty('background-color', 'rgba(255, 255, 255, 0.3)', 'important');
      textarea.style.setProperty('color', 'white', 'important');
      textarea.style.setProperty('caret-color', 'white', 'important');
    }
  }, []);

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

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex max-w-7xl mx-auto gap-6 p-4 animate-in fade-in duration-700">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full backdrop-blur-sm bg-white/5 rounded-2xl shadow-2xl border border-white/20 animate-in slide-in-from-left duration-500 delay-100">
        <div className="backdrop-blur-md bg-white/10 border-b border-white/20 p-6 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg transition-all duration-300 hover:text-blue-200 cursor-default">Accommodations Booking Assistant</h1>
          <ThemeToggle />
        </div>

        {/* Chat content container with fixed height */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
              {limitedMessages.length === 0 ? (
                <div className="flex size-full flex-col items-center justify-center gap-6 p-8 text-center min-h-96">
                  <div className="backdrop-blur-md bg-white/10 rounded-2xl p-8 shadow-xl border border-white/20 space-y-4">
                    <h3 className="font-semibold text-lg text-white drop-shadow-lg">Welcome to your Booking Assistant!</h3>
                    <p className="text-white/80 text-sm leading-relaxed">I'm here to help you find the perfect accommodations for your trip. Please tell me about your travel destination, dates, number of guests, and budget to get started.</p>
                  </div>
                </div>
              ) : (
                limitedMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-${message.role === 'user' ? 'right' : 'left'} duration-300`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`max-w-2xl backdrop-blur-md rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-102 ${
                      message.role === 'user'
                        ? 'bg-blue-500/20 border-blue-400/30 text-white hover:bg-blue-500/30'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
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
                  <div className="max-w-2xl backdrop-blur-md bg-white/10 border-white/20 text-white rounded-2xl shadow-lg border p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">Thinking...</div>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
          <div className="flex-shrink-0 backdrop-blur-md bg-white/5 border-t border-white/20 rounded-b-2xl">
            <div className="max-w-4xl mx-auto p-6">
              <div className="backdrop-blur-sm bg-white/10 rounded-2xl shadow-lg border border-white/20 p-1 transition-all duration-200 hover:shadow-xl hover:bg-white/15 glassmorphism-input">
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputBody>
                    <PromptInputTextarea
                      placeholder="Tell me about your travel plans..."
                      className="border-none focus:ring-0 resize-none transition-all duration-200"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        color: '#1a1a1a',
                        caretColor: '#1a1a1a',
                        '--placeholder-color': 'rgba(26, 26, 26, 0.6)'
                      } as React.CSSProperties}
                    />
                    <PromptInputToolbar className="border-t border-white/10">
                      <div />
                      <PromptInputSubmit
                        status={isLoading ? "submitted" : undefined}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
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
      <div className="w-80 h-full backdrop-blur-sm bg-white/5 rounded-2xl shadow-2xl border border-white/20 p-6 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-500 delay-200">
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
