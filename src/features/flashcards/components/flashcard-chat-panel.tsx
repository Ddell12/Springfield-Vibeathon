"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { VoiceInput } from "@/shared/components/voice-input";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { FlashcardStreamingStatus } from "../hooks/use-flashcard-streaming";

interface FlashcardChatPanelProps {
  sessionId: Id<"sessions"> | null;
  status: FlashcardStreamingStatus;
  activityMessage: string;
  onSubmit: (query: string) => void;
}

export function FlashcardChatPanel({
  sessionId,
  status,
  activityMessage,
  onSubmit,
}: FlashcardChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId } : "skip",
  );
  const isGenerating = status === "generating";

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activityMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSubmit(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={`rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "ml-8 bg-primary/10 text-on-surface"
                  : msg.role === "system"
                    ? "text-xs text-on-surface-variant/60 italic"
                    : "mr-8 bg-surface-container-low text-on-surface"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {isGenerating && activityMessage && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
              {activityMessage}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border/40 bg-surface-container-lowest px-4 pt-3 pb-4"
      >
        <div className="flex items-center gap-2">
          <VoiceInput
            onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
            disabled={isGenerating}
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the flashcards you want..."
            disabled={isGenerating}
            aria-label="Describe the flashcards you want to create"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="shrink-0"
            aria-label="Create flashcards"
          >
            {isGenerating ? (
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
            ) : (
              <MaterialIcon icon="send" size="xs" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
