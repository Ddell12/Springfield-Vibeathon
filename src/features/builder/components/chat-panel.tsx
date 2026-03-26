"use client";

import { useQuery } from "convex/react";
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
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
      <div className="max-w-[85%] break-words rounded-2xl rounded-bl-md bg-surface-container-low px-4 py-3">
        <div className="text-sm text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface-container-lowest [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:ml-4 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-container-lowest [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc">
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

const ACTIVITY_ICONS: Record<Activity["type"], React.ReactNode> = {
  thinking: <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />,
  writing_file: <MaterialIcon icon="code" size="xs" className="animate-pulse text-tertiary" />,
  file_written: <MaterialIcon icon="code" size="xs" className="text-primary" />,
  complete: <MaterialIcon icon="check_circle" size="xs" className="text-primary" filled />,
};

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-300",
        activity.type === "complete"
          ? "bg-primary/5 dark:bg-primary/10"
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
                ? "bg-primary text-on-primary"
                : i === activeIdx
                  ? "bg-primary text-white"
                  : "bg-surface-container-lowest text-on-surface-variant"
            )}
          >
            {i < activeIdx ? (
              <MaterialIcon icon="check" className="text-sm" />
            ) : i === activeIdx ? (
              <MaterialIcon icon="progress_activity" className="text-sm animate-spin" />
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
                i < activeIdx ? "bg-primary" : "bg-border"
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
      <ScrollArea className="min-h-0 flex-1 p-4">
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
              <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
              <span className="text-sm text-on-surface-variant">
                Starting generation...
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
      </ScrollArea>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/40 bg-surface-container-lowest px-4 pt-3 pb-4"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MaterialIcon icon="chat" size="xs" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
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
