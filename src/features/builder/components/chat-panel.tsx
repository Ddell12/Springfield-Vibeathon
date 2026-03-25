"use client";

import { AnimatePresence,motion } from "motion/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
    session.state === "complete";
  const showBlueprint =
    session?.state === "blueprinting" && blueprint && !blueprint.approved;

  const isWorking =
    session &&
    !["idle", "complete", "failed", "blueprinting"].includes(session.state);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {!session && (
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold">
              What would you like to build?
            </h2>
            <p className="text-sm text-muted-foreground">
              Describe a therapy tool and I&apos;ll build it for you.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages?.map((msg: Doc<"messages">) => (
            <motion.div
              key={msg._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`mb-3 rounded-lg p-3 ${
                msg.role === "user"
                  ? "ml-8 bg-primary/10"
                  : msg.role === "system"
                    ? "bg-muted text-sm italic"
                    : "mr-8 bg-muted"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
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
          session.state !== "blueprinting" && (
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
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                session?.state === "complete"
                  ? "Request changes..."
                  : "Describe your therapy tool..."
              }
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim()}>
              {session?.state === "complete" ? "Send" : "Build"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
