"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ScrollArea } from "@/shared/components/ui/scroll-area";

import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useBlueprint, useSessionMessages } from "../hooks/use-session";
import { BlueprintCard } from "./blueprint-card";

interface ChatPanelProps {
  sessionId: Id<"sessions"> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  onSubmit: (prompt: string) => void;
}

const SANCTUARY_EASE = [0.4, 0, 0.2, 1] as const;

const SUGGESTION_CHIPS = [
  "Morning routine schedule",
  "Feelings communication board",
  "Star reward chart",
];

export function ChatPanel({ sessionId, session, onSubmit }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messages = useSessionMessages(sessionId);
  const blueprint = useBlueprint(sessionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput("");
  };

  const showPromptInput =
    !session ||
    session.state === "idle" ||
    session.state === "complete" ||
    session.state === "failed";
  const showBlueprint =
    session?.state === "blueprinting" && blueprint && !blueprint.approved;
  const isFailed = session?.state === "failed";

  // Show typing dots for all active pipeline states.
  // For "blueprinting": show dots while LLM is generating the blueprint,
  // but hide them once the blueprint arrives and awaits approval.
  const isBlueprintPending =
    session?.state === "blueprinting" && (!blueprint || blueprint.approved);
  const isWorking =
    session &&
    (isBlueprintPending ||
      !["idle", "complete", "failed", "blueprinting"].includes(session.state));

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {!session && (
          <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
            {/* Icon */}
            <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <span
                className="material-symbols-outlined text-4xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                forum
              </span>
              <span className="material-symbols-outlined absolute -right-1 -top-1 text-xl text-tertiary">
                auto_awesome
              </span>
            </div>
            <h1 className="mb-3 font-headline text-2xl font-bold text-on-surface">
              What does your child need?
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-on-surface-variant">
              Describe the therapy tool you&apos;re imagining &mdash; a visual
              schedule, communication board, token system, or something else.
              I&apos;ll build it for you.
            </p>
            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onSubmit(chip)}
                  className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages?.map((msg: Doc<"messages">) => (
            <motion.div
              key={msg._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: SANCTUARY_EASE }}
              className={
                msg.role === "user"
                  ? "mb-3 ml-8 rounded-2xl rounded-br-md bg-primary/10 p-3"
                  : msg.role === "system"
                    ? "mb-3 rounded-2xl bg-surface-container-high p-3 text-sm italic text-on-surface-variant"
                    : "mb-3 mr-8 rounded-2xl rounded-bl-md bg-surface-container-low p-3"
              }
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm text-on-surface">
                  {msg.content}
                </p>
              ) : (
                <div className="prose prose-sm max-w-none text-on-surface [&_a]:text-primary [&_h1]:text-base [&_h1]:font-headline [&_h2]:text-sm [&_h2]:font-headline [&_li]:text-on-surface-variant [&_strong]:text-on-surface">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blueprint approval card */}
        {showBlueprint && blueprint && (
          <BlueprintCard sessionId={sessionId!} blueprint={blueprint} />
        )}

        {/* Failed state */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: SANCTUARY_EASE }}
            className="mx-4 mt-4 rounded-2xl bg-error-container/20 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-error">
              <span className="material-symbols-outlined text-base">error</span>
              Something went wrong
            </div>
            <p className="text-xs text-on-surface-variant">
              {session.failureReason
                ? session.failureReason.length > 150
                  ? session.failureReason.substring(0, 150) + "..."
                  : session.failureReason
                : "An unexpected error occurred."}
            </p>
            <p className="mt-2 text-xs text-on-surface-variant">
              Try describing your app again below.
            </p>
          </motion.div>
        )}

        {/* Typing dots when pipeline is working */}
        {isWorking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 mr-8 flex gap-1 rounded-2xl rounded-bl-md bg-surface-container-low p-4"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-primary/60"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        )}

        {/* Status message */}
        {session &&
          session.state !== "idle" &&
          session.state !== "complete" &&
          session.state !== "failed" &&
          !(session.state === "blueprinting" && blueprint && !blueprint.approved) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-center gap-3 rounded-xl bg-surface-container-low p-3"
            >
              <span className="material-symbols-outlined animate-spin text-lg text-primary">
                progress_activity
              </span>
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {session.stateMessage ?? "Working..."}
                </p>
                {session.currentPhaseIndex !== undefined && (
                  <p className="text-xs text-on-surface-variant">
                    Phase {session.currentPhaseIndex + 1}
                    {session.totalPhasesPlanned
                      ? ` of ${session.totalPhasesPlanned}`
                      : ""}
                  </p>
                )}
              </div>
            </motion.div>
          )}
      </ScrollArea>

      {/* Prompt input */}
      {showPromptInput && (
        <div className="bg-surface-container-lowest p-4">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-xl bg-surface-container-high p-2 transition-all focus-within:ring-2 focus-within:ring-primary"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                session?.state === "complete"
                  ? "Ask to modify the board..."
                  : "Describe what you need..."
              }
              className="w-full border-none bg-transparent px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary sanctuary-shadow transition-all hover:bg-primary-container active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
          <p className="mt-3 text-center text-[10px] text-on-surface-variant/60">
            AI can make mistakes. Please verify tool outputs before use.
          </p>
        </div>
      )}
    </div>
  );
}
