"use client";

import { useRef, useState } from "react";

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
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm here to help you build therapy tools. Describe what you need — like a token board, visual schedule, or morning routine tracker — and I'll create it for you.",
};

export function Chat({ projectId: _projectId, onFragmentGenerated }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (message: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, messages }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;
          // Parse Vercel AI SDK stream format: `0:"text chunk"\n`
          const match = line.match(/^0:"(.*)"\s*$/);
          if (match) {
            try {
              const text = JSON.parse(`"${match[1]}"`);
              fullContent += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id ? { ...m, content: fullContent } : m
                )
              );
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      // Try to detect a fragment in the accumulated content
      if (onFragmentGenerated) {
        try {
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = FragmentSchema.safeParse(JSON.parse(jsonMatch[0]));
            if (parsed.success) {
              onFragmentGenerated(parsed.data);
            }
          }
        } catch {
          // no fragment found
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
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
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
