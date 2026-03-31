"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Activity, StreamingStatus } from "../hooks/use-streaming";
import type { TherapyBlueprint } from "../lib/schemas";
import { ArtifactCard } from "./artifact-card";
import { BlueprintCard } from "./blueprint-card";

function UserMessage({ content }: { content: string }) {
  const { user } = useUser();
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-on-surface text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-on-surface/90 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm text-white">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (isStreaming && !content) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        B
      </div>
      <div className="min-w-0 flex-1">
        <div className="overflow-x-auto text-sm text-on-surface [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface-container-lowest [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:ml-4 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-container-lowest [&_pre]:p-3 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {content}
          </ReactMarkdown>
        </div>
        {isStreaming ? (
          <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-primary/60" />
        ) : null}
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

interface ChatPanelProps {
  sessionId: string | null;
  status: StreamingStatus;
  blueprint: TherapyBlueprint | null;
  error: string | null;
  onRetry?: () => void;
  streamingText: string;
  activities: Activity[];
  pendingPrompt?: string | null;
  onPendingPromptClear?: () => void;
  appTitle: string;
  onArtifactClick?: () => void;
}

export function ChatPanel({
  sessionId,
  status,
  blueprint,
  error,
  onRetry,
  streamingText,
  activities,
  pendingPrompt,
  onPendingPromptClear,
  appTitle,
  onArtifactClick,
}: ChatPanelProps) {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.messages.list,
    sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip",
  );

  const isGenerating = status === "generating";
  const isLive = status === "live";

  useEffect(() => {
    if (pendingPrompt && messages && messages.some((m) => m.role === "user")) {
      onPendingPromptClear?.();
    }
  }, [messages, pendingPrompt, onPendingPromptClear]);

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length, streamingText, activities.length, isGenerating, isLive, pendingPrompt]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4">
        {pendingPrompt && (!messages || !messages.some((m) => m.role === "user")) && (
          <UserMessage content={pendingPrompt} />
        )}

        {messages?.map((msg: { _id: string; role: string; content: string }) => {
          if (msg.role === "user") return <UserMessage key={msg._id} content={msg.content} />;
          if (msg.role === "system") return <SystemMessage key={msg._id} content={msg.content} />;
          return <AssistantMessage key={msg._id} content={msg.content} />;
        })}

        {streamingText && <AssistantMessage content={streamingText} isStreaming />}

        {blueprint ? <BlueprintCard blueprint={blueprint} /> : null}

        {(isGenerating || isLive) && (
          <ArtifactCard
            title={appTitle}
            isGenerating={isGenerating}
            onClick={isLive ? onArtifactClick : undefined}
          />
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">We hit a small bump</p>
            <p className="mt-1 text-xs text-destructive/80">Want to try again?</p>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:text-destructive"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
}
