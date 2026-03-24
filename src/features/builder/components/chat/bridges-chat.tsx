"use client";

import {
  type AppendMessage,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  type ThreadMessageLike,
  ThreadPrimitive,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { type UIMessage,useUIMessages } from "@convex-dev/agent/react";
import { optimisticallySendMessage } from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { useCallback, useRef } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../../convex/_generated/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BridgesChatProps = {
  threadId: string | null;
};

// ---------------------------------------------------------------------------
// Message conversion: UIMessage (Convex Agent) → ThreadMessageLike (assistant-ui)
// ---------------------------------------------------------------------------

function convertMessage(message: UIMessage): ThreadMessageLike {
  const status: ThreadMessageLike["status"] =
    message.role === "assistant"
      ? (message.status === "streaming" || message.status === "pending"
          ? { type: "running" as const }
          : message.status === "failed"
            ? { type: "incomplete" as const, reason: "error" as const }
            : { type: "complete" as const, reason: "stop" as const })
      : undefined;

  const content: ThreadMessageLike["content"] =
    message.parts && message.parts.length > 0
      ? (message.parts
          .map((part) => {
            if (part.type === "text") {
              return { type: "text" as const, text: part.text };
            }
            if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
              const toolPart = part as {
                type: string;
                toolCallId: string;
                toolName?: string;
                state: string;
                input?: unknown;
                output?: unknown;
              };
              return {
                type: "tool-call" as const,
                toolCallId: toolPart.toolCallId,
                toolName:
                  toolPart.toolName ??
                  toolPart.type.replace(/^tool-/, ""),
                args: (toolPart.input ?? {}) as Record<string, unknown>,
                result: toolPart.output,
              };
            }
            if ("text" in part && typeof part.text === "string") {
              return { type: "text" as const, text: part.text };
            }
            return null;
          })
          .filter(Boolean) as ThreadMessageLike["content"])
      : message.text || "";

  return {
    role: message.role as "user" | "assistant" | "system",
    content,
    id: message.id,
    createdAt: new Date(message._creationTime),
    status,
  };
}

// ---------------------------------------------------------------------------
// Welcome state (no thread yet)
// ---------------------------------------------------------------------------

function WelcomeState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative">
        <div className="bg-primary/10 p-4 rounded-2xl">
          <MaterialIcon icon="forum" size="xl" className="text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 text-secondary">
          <MaterialIcon icon="auto_awesome" size="sm" />
        </div>
      </div>
      <h2 className="font-headline text-2xl font-bold text-on-surface">
        What does your child need?
      </h2>
      <p className="max-w-sm text-sm text-on-surface-variant">
        Tell me what you need — a communication board, a token economy, a visual
        schedule — and I&apos;ll create it for you.
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        <button className="px-4 py-2 rounded-full bg-surface-container-low text-primary font-medium text-sm hover:bg-primary hover:text-white transition-colors">
          Morning routine schedule
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-low text-primary font-medium text-sm hover:bg-primary hover:text-white transition-colors">
          Feelings communication board
        </button>
        <button className="px-4 py-2 rounded-full bg-surface-container-low text-primary font-medium text-sm hover:bg-primary hover:text-white transition-colors">
          Star reward chart
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat message bubbles
// ---------------------------------------------------------------------------

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end px-4 py-2">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary-container text-white px-4 py-2.5">
        <MessagePrimitive.Content
          components={{ Text: MessagePartText }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start px-4 py-2">
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-surface-container-low text-on-surface border border-outline-variant/10 px-4 py-2.5">
        <MessagePrimitive.Content
          components={{ Text: MessagePartText }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function MessagePartText() {
  return (
    <MessagePartPrimitive.Text className="whitespace-pre-wrap text-sm leading-relaxed" />
  );
}

// ---------------------------------------------------------------------------
// Composer (input area)
// ---------------------------------------------------------------------------

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-2 bg-surface-container-lowest px-4 py-3">
      <ComposerPrimitive.Input
        placeholder="Describe what you need..."
        className="flex-1 resize-none rounded-xl bg-surface-container-high px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:ring-1 focus:ring-primary"
        autoFocus
      />
      <ComposerPrimitive.Send className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-gradient text-white transition-colors disabled:opacity-40">
        <MaterialIcon icon="send" size="sm" />
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Thread (message list + composer)
// ---------------------------------------------------------------------------

function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport aria-live="polite" className="flex flex-1 flex-col overflow-y-auto">
        <ThreadPrimitive.Empty>
          <WelcomeState />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>
      <Composer />
    </ThreadPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Main export: BridgesChat
// ---------------------------------------------------------------------------

export function BridgesChat({ threadId }: BridgesChatProps) {
  // Fetch messages from Convex Agent (paginated + streaming)
  const { results: messages } = useUIMessages(
    api.chat.streaming.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 20, stream: true },
  );

  // Mutation for sending messages, with optimistic update
  const sendMessage = useMutation(
    api.chat.streaming.initiateStreaming,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.chat.streaming.listThreadMessages),
  );

  // Determine if the assistant is currently generating
  const isRunning =
    messages.length > 0 &&
    (messages[messages.length - 1]?.status === "streaming" ||
      messages[messages.length - 1]?.status === "pending");

  // Stable callback for sending a new message
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;

  const handleNew = useCallback(
    async (message: AppendMessage) => {
      const currentThreadId = threadIdRef.current;
      if (!currentThreadId) return;

      const text =
        message.content
          ?.filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text",
          )
          .map((part) => part.text)
          .join("\n") || "";

      if (!text.trim()) return;

      await sendMessage({ prompt: text, threadId: currentThreadId });
    },
    [sendMessage],
  );

  // Wire Convex Agent messages → assistant-ui runtime
  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage,
    onNew: handleNew,
  });

  // If there's no threadId, show the welcome state without a runtime
  if (!threadId) {
    return (
      <div className="flex h-full flex-col bg-surface-container-lowest">
        <WelcomeState />
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full flex-col bg-surface-container-lowest">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
