"use client";

import { useState } from "react";
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

  // Keep only the last 10 messages to reduce context size
  const limitedMessages = messages.slice(-10);
  const [isLoading, setIsLoading] = useState(false);
  const [travelCriteria, setTravelCriteria] = useState<TravelCriteria>({});
  const [searchResults, setSearchResults] = useState<AccommodationResult[]>([]);

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
        body: JSON.stringify({ message: message.text }),
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

    // Reset form
    (event.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-background flex max-w-7xl mx-auto gap-4">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Travel Planning Assistant</h1>
          <ThemeToggle />
        </div>

        <Conversation className="flex-1">
          <ConversationContent className="space-y-4">
            {limitedMessages.length === 0 ? (
              <ConversationEmptyState
                title="Welcome to your Travel Planning Assistant!"
                description="I'm here to help you find the perfect accommodations for your trip. Please tell me about your travel destination, dates, number of guests, and budget to get started."
              />
            ) : (
              limitedMessages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    <FormattedMessage content={message.content} role={message.role} />
                  </MessageContent>
                </Message>
              ))
            )}
            {isLoading && (
              <Message from="assistant">
                <MessageContent>
                  Thinking...
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
        </Conversation>

        <div className="p-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Tell me about your travel plans..." />
              <PromptInputToolbar>
                <div />
                <PromptInputSubmit status={isLoading ? "submitted" : undefined} />
              </PromptInputToolbar>
            </PromptInputBody>
          </PromptInput>
        </div>
      </div>

      {/* Travel summary sidebar */}
      <div className="w-80 border-l p-4 bg-muted/10 space-y-6 overflow-y-auto">
        <TravelSummary criteria={travelCriteria} />

        <SearchAccommodations
          criteria={travelCriteria}
          onSearchResults={setSearchResults}
        />

        <SearchResults
          results={searchResults}
          onClear={() => setSearchResults([])}
        />
      </div>
    </div>
  );
}
