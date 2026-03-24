"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import type { FragmentResult } from "../lib/schema";
import { FragmentSchema } from "../lib/schema";
import { ChatInput } from "./chat-input";
import type { ProgressPhase } from "./file-progress";
import type { MessageType } from "./chat-message";
import { ChatMessage } from "./chat-message";
import { SuggestedActions } from "./suggested-actions";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: MessageType;
  fragment?: FragmentResult;
};

type ChatProps = {
  projectId?: string;
  onFragmentGenerated?: (fragment: FragmentResult) => void;
  onMessagesChange?: (messages: Message[]) => void;
  initialMessages?: Message[];
  currentCode?: string;
  initialMessage?: string | null;
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm here to help you build therapy tools. Describe what you need — like a token board, visual schedule, or morning routine tracker — and I'll build it right away.",
  type: "text",
};

export function Chat({
  onFragmentGenerated,
  onMessagesChange,
  initialMessages,
  currentCode,
  initialMessage,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>("started");
  const [latestFragment, setLatestFragment] = useState<FragmentResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasAutoSentRef = useRef(false);

  useEffect(() => {
    if (initialMessage && !hasAutoSentRef.current && !isLoading) {
      hasAutoSentRef.current = true;
      handleSubmit(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, isLoading]);

  const handleSubmit = async (message: string) => {
    setProgressPhase("started");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      type: "text",
    };

    const thinkingMessageId = `thinking-${Date.now()}`;
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      role: "assistant",
      content: "",
      type: "thinking",
    };

    const isIteration = !!currentCode;

    setMessages((prev) => [
      ...prev,
      userMessage,
      ...(isIteration ? [] : [thinkingMessage]),
    ]);
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      // Filter messages for API: only user messages + meaningful assistant responses
      const apiMessages = [...messages, userMessage]
        .filter((m) => {
          if (m.role === "user") return true;
          if (m.type === "text" || m.type === "complete") return true;
          return false;
        })
        .map((m) => ({
          role: m.role,
          content:
            m.type === "complete" && m.fragment
              ? `I built a ${m.fragment.title}: ${m.fragment.description}`
              : m.content,
        }));

      // ── Phase 1: Design Plan (first generation only) ────────────────────
      if (!isIteration) {
        const planResponse = await fetch("/api/chat/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortRef.current.signal,
        });

        if (!planResponse.ok || !planResponse.body) {
          throw new Error("Plan request failed");
        }

        // Stream plan text live into the thinking message
        const planReader = planResponse.body.getReader();
        const planDecoder = new TextDecoder();
        let planText = "";

        while (true) {
          const { done, value } = await planReader.read();
          if (done) break;

          const chunk = planDecoder.decode(value, { stream: true });
          // Vercel AI SDK text stream format: lines like `0:"text chunk"\n`
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const jsonStr = line.slice(2);
                const textChunk = JSON.parse(jsonStr) as string;
                planText += textChunk;
              } catch {
                planText += line.slice(2);
              }
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingMessageId ? { ...m, content: planText } : m
            )
          );
        }

        // Phase 1 complete — mark as "plan"
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingMessageId ? { ...m, type: "plan" } : m
          )
        );
      }

      // ── Phase 2: Code Generation (always runs) ─────────────────────────
      const buildingMessageId = `building-${Date.now()}`;
      const buildingMessage: Message = {
        id: buildingMessageId,
        role: "assistant",
        content: currentCode ? "Updating your tool..." : "Building your tool...",
        type: "building",
      };

      setMessages((prev) => [...prev, buildingMessage]);

      const context = currentCode
        ? `The user already has a working tool. Here is the current code:\n\`\`\`\n${currentCode}\n\`\`\`\nModify it based on the user's request. Keep what works, change what they asked for.`
        : undefined;

      const generateResponse = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context }),
        signal: abortRef.current.signal,
      });

      if (!generateResponse.ok || !generateResponse.body) {
        throw new Error("Generate request failed");
      }

      // Accumulate the streamed JSON (generate returns structured object)
      const generateReader = generateResponse.body.getReader();
      const generateDecoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await generateReader.read();
        if (done) {
          setProgressPhase("complete");
          break;
        }
        fullText += generateDecoder.decode(value, { stream: true });

        // Detect field markers in accumulated JSON to drive progress UI
        if (fullText.includes('"title"')) setProgressPhase("title");
        if (fullText.includes('"description"')) setProgressPhase("description");
        if (fullText.includes('"code"')) {
          const codeKeyIndex = fullText.indexOf('"code"');
          const textAfterCode = fullText.length - codeKeyIndex;
          // Advance to "code-streaming" once meaningful code content is flowing
          if (textAfterCode > 80) {
            setProgressPhase("code-streaming");
          } else {
            setProgressPhase("code-started");
          }
        }
        if (fullText.includes('"file_path"')) setProgressPhase("file-path");
        if (fullText.includes('"has_additional_dependencies"')) setProgressPhase("dependencies");
      }

      // Parse the completed FragmentResult
      const parsed = FragmentSchema.safeParse(JSON.parse(fullText));
      if (parsed.success) {
        const fragment = parsed.data;

        // Ensure Next.js components have "use client" directive
        if (
          fragment.template === "nextjs-developer" &&
          !fragment.code.trimStart().startsWith('"use client"') &&
          !fragment.code.trimStart().startsWith("'use client'")
        ) {
          fragment.code = `"use client";\n${fragment.code}`;
        }

        // Mark building message as complete — attach fragment for CompletionMessage rendering
        setMessages((prev) =>
          prev.map((m) =>
            m.id === buildingMessageId
              ? {
                  ...m,
                  type: "complete" as MessageType,
                  content: `Here's your ${fragment.title}! ${fragment.description} Let me know if you want any changes.`,
                  fragment,
                }
              : m
          )
        );

        setLatestFragment(fragment);
        onFragmentGenerated?.(fragment);
        onMessagesChange?.(messages);
      } else {
        throw new Error("Failed to parse generated code");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        // Show error in the thinking message if plan failed, otherwise last message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === prev[prev.length - 1]?.id
              ? {
                  ...m,
                  type: "text" as MessageType,
                  content:
                    "Sorry, something went wrong building your tool. Please try describing it again.",
                }
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
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChatMessage
              role={msg.role}
              content={msg.content}
              type={msg.type}
              progressPhase={msg.type === "building" ? progressPhase : undefined}
              fragment={msg.fragment}
            />
          </motion.div>
        ))}
      </div>
      {latestFragment && !isLoading && (
        <SuggestedActions
          fragment={latestFragment}
          onAction={handleSubmit}
        />
      )}
      <ChatInput
        onSubmit={handleSubmit}
        onStop={() => abortRef.current?.abort()}
        isLoading={isLoading}
        placeholder={
          currentCode
            ? "What would you like to change?"
            : "Describe the therapy tool you want to build..."
        }
      />
    </div>
  );
}
