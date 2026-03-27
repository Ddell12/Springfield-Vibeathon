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
  pendingPrompt?: string | null;
  onPendingPromptClear?: () => void;
}

export function FlashcardChatPanel({
  sessionId,
  status,
  activityMessage,
  onSubmit,
  pendingPrompt,
  onPendingPromptClear,
}: FlashcardChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId } : "skip",
  );
  const isGenerating = status === "generating";

  // Clear pending prompt once real messages arrive from Convex
  useEffect(() => {
    if (pendingPrompt && messages && messages.some((m) => m.role === "user")) {
      onPendingPromptClear?.();
    }
  }, [messages, pendingPrompt, onPendingPromptClear]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activityMessage, pendingPrompt]);

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
          {/* Show user's prompt immediately before Convex subscription catches up */}
          {pendingPrompt && (!messages || !messages.some((m) => m.role === "user")) && (
            <div className="flex items-end flex-col">
              <span className="mb-1 px-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                You
              </span>
              <div className="max-w-[90%] rounded-2xl rounded-tr-none bg-primary px-4 py-2.5 text-sm text-on-primary shadow-sm">
                {pendingPrompt}
              </div>
            </div>
          )}

          {messages?.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${
                msg.role === "user" ? "items-end" : "items-start"
              } flex-col`}
            >
              {msg.role !== "system" && (
                <span className="mb-1 px-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {msg.role === "user" ? "You" : "Therapy Assistant"}
                </span>
              )}
              <div
                className={`text-sm ${
                  msg.role === "user"
                    ? "max-w-[90%] rounded-2xl rounded-tr-none bg-primary px-4 py-2.5 text-on-primary shadow-sm"
                    : msg.role === "system"
                      ? "text-xs italic text-on-surface-variant/60"
                      : "max-w-[90%] rounded-2xl rounded-tl-none bg-surface-container-lowest px-4 py-2.5 shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {(isGenerating || status === "failed") && activityMessage && (
            <div className={`flex items-center gap-2 text-xs ${
              status === "failed" ? "text-destructive" : "text-on-surface-variant/60"
            }`}>
              <MaterialIcon
                icon={status === "failed" ? "error" : "progress_activity"}
                size="xs"
                className={status === "failed" ? "" : "animate-spin"}
              />
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
