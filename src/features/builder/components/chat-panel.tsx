"use client";

import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { StreamingStatus } from "../hooks/use-streaming";
import { BlueprintCard } from "./blueprint-card";
import { SuggestionChips } from "./suggestion-chips";
import { ThinkingIndicator } from "./thinking-indicator";

const THERAPY_SUGGESTIONS = [
  "Token board with star rewards",
  "Visual daily schedule",
  "Communication picture board",
  "Feelings check-in tool",
];

interface ChatPanelProps {
  sessionId: Id<"sessions"> | null;
  status: StreamingStatus;
  blueprint: Record<string, unknown> | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
}

export function ChatPanel({
  sessionId,
  status,
  blueprint,
  error,
  onGenerate,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const generationStartRef = useRef<number | null>(null);
  const messages = useQuery(api.messages.list, sessionId ? { sessionId } : "skip");

  const isGenerating = status === "generating";
  const isLive = status === "live";
  const isEmpty = !sessionId && status === "idle";

  if (isGenerating && !generationStartRef.current) {
    generationStartRef.current = Date.now();
  }
  if (!isGenerating) {
    generationStartRef.current = null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onGenerate(input.trim());
    setInput("");
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onGenerate(suggestion);
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="font-headline text-xl font-semibold">
                What would you like to build?
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Describe a therapy tool and I&apos;ll build it for you.
              </p>
            </div>
            <SuggestionChips
              suggestions={THERAPY_SUGGESTIONS}
              onSelect={handleSuggestionSelect}
            />
          </div>
        )}

        {messages?.map(
          (msg: { _id: string; role: string; content: string }) => (
            <div
              key={msg._id}
              className={cn(
                "mb-3 rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "ml-8 bg-primary/5"
                  : msg.role === "system"
                    ? "bg-surface-container-low text-sm italic"
                    : "mr-8 bg-surface-container-low"
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          )
        )}

        {blueprint && <BlueprintCard blueprint={blueprint} />}

        {isGenerating && (
          <ThinkingIndicator
            isThinking
            startTime={generationStartRef.current ?? undefined}
          />
        )}

        {isLive && (
          <div className="mt-2 text-sm text-green-600">
            App is live and ready!
          </div>
        )}

        {error && (
          <div className="mt-2 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="bg-surface-container-low px-4 pt-3 pb-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isLive ? "Request changes..." : "Describe your therapy tool..."
            }
            disabled={isGenerating}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isGenerating}>
            {isLive ? "Send" : "Build"}
          </Button>
        </div>
      </form>
    </div>
  );
}
