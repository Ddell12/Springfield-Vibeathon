"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { VoiceInput } from "@/shared/components/voice-input";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Activity, StreamingStatus } from "../hooks/use-streaming";
import { THERAPY_SUGGESTIONS } from "../lib/constants";
import type { TherapyBlueprint } from "../lib/schemas";
import { BlueprintCard } from "./blueprint-card";
import { FileBadges } from "./file-badges";
import { SuggestionChips } from "@/shared/components/suggestion-chips";

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-primary/10 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm text-foreground">{content}</p>
      </div>
    </div>
  );
}

function AssistantBubble({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (isStreaming && !content) return null;
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md border border-outline-variant/15 bg-surface-container px-4 py-3">
        <div className="overflow-x-auto text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface-container-lowest [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:ml-4 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-container-lowest [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {isStreaming && <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-primary/60" />}
      </div>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-surface-container-low px-4 py-1.5">
        <p className="text-xs text-on-surface-variant">{content}</p>
      </div>
    </div>
  );
}

// --- Main ChatPanel ---

interface ChatPanelProps {
  sessionId: string | null;
  status: StreamingStatus;
  blueprint: TherapyBlueprint | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
  onRetry?: () => void;
  streamingText: string;
  activities: Activity[];
}

export function ChatPanel({
  sessionId,
  status,
  blueprint,
  error,
  onGenerate,
  onRetry,
  streamingText,
  activities,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip"
  );

  const isGenerating = status === "generating";
  const isLive = status === "live";
  const isEmpty = !sessionId && status === "idle";

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (scrollEndRef.current && typeof scrollEndRef.current.scrollIntoView === "function") {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages?.length, streamingText, activities.length]);

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
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {/* Empty state */}
          {isEmpty && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <MaterialIcon icon="auto_awesome" size="md" className="text-primary" />
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

          {/* Persisted messages from Convex */}
          {messages?.map(
            (msg: { _id: string; role: string; content: string }) => {
              if (msg.role === "user") {
                return <UserMessage key={msg._id} content={msg.content} />;
              }
              if (msg.role === "system") {
                return <SystemMessage key={msg._id} content={msg.content} />;
              }
              return <AssistantBubble key={msg._id} content={msg.content} />;
            }
          )}

          {/* Blueprint card */}
          {blueprint && <BlueprintCard blueprint={blueprint} />}

          {/* Thinking indicator */}
          {isGenerating && activities.some((a) => a.type === "thinking") && (
            <div className="flex items-center gap-2 py-1">
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
              <span className="text-sm text-on-surface-variant">Thinking...</span>
            </div>
          )}

          {/* Lovable-style file badges — only during generation to avoid stale display */}
          {isGenerating && activities.length > 0 && (
            <FileBadges
              files={activities
                .filter((a) => a.type === "file_written" && a.path)
                .map((a) => ({ path: a.path!, action: "Edited" as const }))}
            />
          )}

          {/* Streaming assistant text */}
          {isGenerating && streamingText && (
            <AssistantBubble content={streamingText} isStreaming />
          )}

          {/* Generating indicator when no streaming text yet */}
          {isGenerating && !streamingText && activities.length === 0 && (
            <div className="flex items-center gap-2 py-2">
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
              <span className="text-sm text-on-surface-variant">
                Starting generation&#8230;
              </span>
            </div>
          )}

          {/* Success state */}
          {isLive && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 dark:bg-primary/10">
              <MaterialIcon icon="check_circle" size="sm" className="text-primary" filled />
              <div>
                <p className="text-sm font-medium text-primary dark:text-primary-fixed-dim">
                  App is live and ready!
                </p>
                <p className="text-xs text-primary/70 dark:text-primary-fixed-dim/70">
                  Check the preview panel. Send a message to request changes.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-xl bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">
                Something went wrong
              </p>
              <p className="mt-1 text-xs text-destructive/80">{error}</p>
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive hover:text-destructive"
                  onClick={onRetry}
                >
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/40 bg-surface-container-lowest px-4 pt-3 pb-4"
      >
        <div className="flex items-center gap-2">
          <VoiceInput
            onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
            disabled={isGenerating}
          />
          <div className="relative flex-1">
            <MaterialIcon icon="chat" size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isLive
                  ? "Request changes to your app\u2026"
                  : "Describe the therapy tool you want to build\u2026"
              }
              disabled={isGenerating}
              className="pl-10"
              aria-label={isLive ? "Request changes to your app" : "Describe the therapy tool you want to build"}
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="shrink-0"
            aria-label={isGenerating ? "Generating" : isLive ? "Send message" : "Generate app"}
          >
            {isGenerating ? (
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" />
            ) : isLive ? (
              <MaterialIcon icon="send" size="xs" />
            ) : (
              <MaterialIcon icon="auto_fix_high" size="xs" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
