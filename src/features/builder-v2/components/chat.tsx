"use client";

import { useEffect, useRef, useState } from "react";

import type { FragmentResult } from "../lib/schema";
import { FragmentSchema } from "../lib/schema";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatProps = {
  projectId?: string;
  onFragmentGenerated?: (fragment: FragmentResult) => void;
  currentCode?: string;
  initialMessage?: string | null;
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm here to help you build therapy tools. Describe what you need — like a token board, visual schedule, or morning routine tracker — and I'll build it right away.",
};

export function Chat({
  projectId: _projectId,
  onFragmentGenerated,
  currentCode,
  initialMessage,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [hasAutoSent, setHasAutoSent] = useState(false);

  useEffect(() => {
    if (initialMessage && !hasAutoSent && !isLoading) {
      setHasAutoSent(true);
      handleSubmit(initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, hasAutoSent, isLoading]);

  const handleSubmit = async (message: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    const buildingMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: currentCode
        ? "Updating your tool..."
        : "Building your tool — this takes about 15 seconds...",
    };

    setMessages((prev) => [...prev, userMessage, buildingMessage]);
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      // Go straight to code generation — every message generates/updates code
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // If iterating, inject current code into context
      const context = currentCode
        ? `The user already has a working tool. Here is the current code:\n\`\`\`\n${currentCode}\n\`\`\`\nModify it based on the user's request. Keep what works, change what they asked for.`
        : undefined;

      const response = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, context }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      // Accumulate the streamed JSON
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      // Parse the completed FragmentResult
      const parsed = FragmentSchema.safeParse(JSON.parse(fullText));
      if (parsed.success) {
        // Update the building message with success
        setMessages((prev) =>
          prev.map((m) =>
            m.id === buildingMessage.id
              ? {
                  ...m,
                  content: `Here's your ${parsed.data.title}! ${parsed.data.description} Let me know if you want any changes.`,
                }
              : m
          )
        );

        onFragmentGenerated?.(parsed.data);
      } else {
        throw new Error("Failed to parse generated code");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === buildingMessage.id
              ? {
                  ...m,
                  content:
                    "Sorry, something went wrong building your tool. Please try describing it again.",
                }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
      </div>
      <ChatInput
        onSubmit={handleSubmit}
        onStop={() => abortRef.current?.abort()}
        isLoading={isLoading}
        placeholder={
          currentCode
            ? "What would you like to change?"
            : "Describe the therapy tool you want to build..."
        }
      />
    </div>
  );
}
