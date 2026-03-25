"use client";

import { useQuery } from "convex/react";
import {
  CheckCircle2,
  FileCode2,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { Activity, StreamingStatus } from "../hooks/use-streaming";
import type { TherapyBlueprint } from "../lib/schemas";
import { BlueprintCard } from "./blueprint-card";
import { SuggestionChips } from "./suggestion-chips";

const THERAPY_SUGGESTIONS = [
  "Token board with star rewards for completing morning tasks",
  "Visual daily schedule with drag-to-reorder steps",
  "Communication picture board with text-to-speech",
  "Feelings check-in tool with emoji faces and journaling",
];

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/10 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm text-foreground">{content}</p>
      </div>
    </div>
  );
}

function AssistantBubble({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (isStreaming && !content) return null;
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface-container-low px-4 py-3">
        <p className="whitespace-pre-wrap text-sm text-foreground">{content}</p>
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

const ACTIVITY_ICONS: Record<Activity["type"], React.ReactNode> = {
  thinking: <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Loading" />,
  writing_file: <FileCode2 className="h-4 w-4 animate-pulse text-amber-500" />,
  file_written: <FileCode2 className="h-4 w-4 text-green-600" />,
  complete: <CheckCircle2 className="h-4 w-4 text-green-600" />,
};

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300",
        activity.type === "complete"
          ? "bg-green-50 dark:bg-green-950/20"
          : "bg-surface-container-low"
      )}
    >
      {ACTIVITY_ICONS[activity.type]}
      <span className="text-sm text-on-surface-variant">
        {activity.message}
      </span>
      {activity.path && (
        <code className="ml-auto rounded bg-surface-container-lowest px-2 py-0.5 text-xs font-mono text-primary">
          {activity.path}
        </code>
      )}
    </div>
  );
}

const ProgressSteps = memo(function ProgressSteps({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;

  // Dedupe by type — show latest of each type
  const steps: { type: Activity["type"]; label: string; done: boolean }[] = [
    {
      type: "thinking",
      label: "Understanding request",
      done: activities.some(
        (a) => a.type === "writing_file" || a.type === "file_written" || a.type === "complete"
      ),
    },
    {
      type: "writing_file",
      label: "Generating code",
      done: activities.some((a) => a.type === "file_written"),
    },
    {
      type: "file_written",
      label: "Files written",
      done: activities.some((a) => a.type === "complete"),
    },
    {
      type: "complete",
      label: "Ready!",
      done: activities.some((a) => a.type === "complete"),
    },
  ];

  // Find current step (first not-done)
  const currentIdx = steps.findIndex((s) => !s.done);
  const activeIdx = currentIdx === -1 ? steps.length - 1 : currentIdx;

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-container-low px-4 py-3">
      {steps.map((step, i) => (
        <div key={step.type} className="flex items-center gap-1">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
              i < activeIdx
                ? "bg-green-600 text-white"
                : i === activeIdx
                  ? "bg-primary text-white"
                  : "bg-surface-container-lowest text-on-surface-variant"
            )}
          >
            {i < activeIdx ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : i === activeIdx ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Loading" />
            ) : (
              i + 1
            )}
          </div>
          <span
            className={cn(
              "text-xs transition-colors",
              i <= activeIdx
                ? "font-medium text-foreground"
                : "text-on-surface-variant"
            )}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-1 h-px w-4 transition-colors",
                i < activeIdx ? "bg-green-600" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
});

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
  const lastScrollRef = useRef(0);

  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip"
  );

  const isGenerating = status === "generating";
  const isLive = status === "live";
  const isEmpty = !sessionId && status === "idle";

  // Auto-scroll to bottom on new content — throttled to 200ms to avoid jitter during streaming
  useEffect(() => {
    const now = Date.now();
    if (now - lastScrollRef.current < 200) return;
    lastScrollRef.current = now;
    scrollEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, streamingText, activities, status]);

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
        <div className="flex flex-col gap-3">
          {/* Empty state */}
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

          {/* Progress steps during generation */}
          {isGenerating && activities.length > 0 && (
            <ProgressSteps activities={activities} />
          )}

          {/* Activity feed during generation */}
          {isGenerating &&
            activities
              .filter((a) => a.type === "file_written")
              .map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}

          {/* Streaming assistant text */}
          {isGenerating && streamingText && (
            <AssistantBubble content={streamingText} isStreaming />
          )}

          {/* Generating indicator when no streaming text yet */}
          {isGenerating && !streamingText && activities.length === 0 && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Loading" />
              <span className="text-sm text-on-surface-variant">
                Starting generation...
              </span>
            </div>
          )}

          {/* Success state */}
          {isLive && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 dark:bg-green-950/20">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  App is live and ready!
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-500/70">
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
      </ScrollArea>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/40 bg-surface-container-lowest px-4 pt-3 pb-4"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isLive
                  ? "Request changes to your app..."
                  : "Describe the therapy tool you want to build..."
              }
              disabled={isGenerating}
              className="pl-10"
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading" />
            ) : isLive ? (
              <Send className="h-4 w-4" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
