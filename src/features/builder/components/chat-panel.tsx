"use client";

import { useState } from "react";

import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionMessages, useBlueprint } from "../hooks/use-session";
import { BlueprintCard } from "./blueprint-card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

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

        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`mb-3 rounded-lg p-3 ${
              msg.role === "user"
                ? "ml-8 bg-primary/10"
                : msg.role === "system"
                  ? "bg-muted text-sm italic"
                  : "mr-8 bg-muted"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
          </div>
        ))}

        {/* Blueprint approval card */}
        {showBlueprint && blueprint && (
          <BlueprintCard sessionId={sessionId!} blueprint={blueprint} />
        )}

        {/* Status message */}
        {session &&
          session.state !== "idle" &&
          session.state !== "complete" &&
          session.state !== "blueprinting" && (
            <div className="mt-2 text-sm text-muted-foreground">
              {session.stateMessage ?? "Working..."}
            </div>
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
