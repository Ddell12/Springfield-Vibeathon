"use client";

import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { useUIMessages, type UIMessage } from "@convex-dev/agent/react";
import { optimisticallySendMessage } from "@convex-dev/agent/react";
import {
  useExternalStoreRuntime,
  AssistantRuntimeProvider,
  type ThreadMessageLike,
  type AppendMessage,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
} from "@assistant-ui/react";
import { SendHorizontal } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { cn } from "@/core/utils";

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
  // UIMessage from @convex-dev/agent extends the AI SDK UIMessage.
  // It has: id, role, parts, text, status, key, order, stepOrder, agentName, etc.
  // status is UIStatus = "streaming" | "pending" | "success" | "failed"
  //
  // ThreadMessageLike needs: role, content (string | parts[]), id?, status?
  // assistant-ui MessageStatus: { type: "running" } | { type: "complete", reason } | { type: "incomplete", reason }

  const status: ThreadMessageLike["status"] =
    message.status === "streaming"
      ? { type: "running" as const }
      : message.status === "failed"
        ? { type: "incomplete" as const, reason: "error" as const }
        : message.status === "pending"
          ? { type: "running" as const }
          : { type: "complete" as const, reason: "stop" as const };

  // Convert parts. UIMessage.parts is an array of AI SDK message parts.
  // Part types: TextUIPart { type: "text", text }, ToolUIPart { type: "tool-{name}", toolCallId, state, input/output },
  // DynamicToolUIPart { type: "dynamic-tool", toolName, toolCallId, state, input/output }
  //
  // assistant-ui ThreadMessageLike content supports: string | array of
  //   { type: "text", text } | { type: "tool-call", toolCallId, toolName, args, result }

  const content: ThreadMessageLike["content"] =
    message.parts && message.parts.length > 0
      ? (message.parts
          .map((part) => {
            if (part.type === "text") {
              return { type: "text" as const, text: part.text };
            }
            // Tool parts in AI SDK UIMessage have type "tool-{toolName}" or "dynamic-tool"
            // They have: toolCallId, state, input (args), output (result)
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
            // Fallback: render as text if we can extract text
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
        <svg
          className="h-7 w-7 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Describe the therapy tool you&apos;d like to build
      </h2>
      <p className="max-w-sm text-sm text-muted">
        Tell me what you need — a communication board, a token economy, a visual
        schedule — and I&apos;ll create it for you.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat message bubbles
// ---------------------------------------------------------------------------

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end px-4 py-2">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-white">
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
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-surface-raised px-4 py-2.5 text-foreground">
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
    <ComposerPrimitive.Root className="flex items-end gap-2 border-t border-border bg-surface px-4 py-3">
      <ComposerPrimitive.Input
        placeholder="Describe what you need..."
        className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        autoFocus
      />
      <ComposerPrimitive.Send className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40">
        <SendHorizontal className="h-4 w-4" />
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
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto">
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
  const { results: messages, status: paginationStatus } = useUIMessages(
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

      // Extract text from the AppendMessage content parts
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
      <div className="flex h-full flex-col bg-surface">
        <WelcomeState />
      </div>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full flex-col bg-surface">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
