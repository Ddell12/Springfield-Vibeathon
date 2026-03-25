"use client";

import { useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { StreamingStatus } from "../hooks/use-streaming";
import { BlueprintCard } from "./blueprint-card";

interface ChatPanelProps {
  sessionId: Id<"sessions"> | null;
  status: StreamingStatus;
  blueprint: Record<string, unknown> | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
}

export function ChatPanel({
  sessionId,
  status,
  blueprint,
  error,
  onGenerate,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messages = useQuery(api.messages.list, sessionId ? { sessionId } : "skip");

  const isGenerating = status === "generating";
  const isLive = status === "live";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onGenerate(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {!sessionId && status === "idle" && (
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold">What would you like to build?</h2>
            <p className="text-sm text-muted-foreground">
              Describe a therapy tool and I&apos;ll build it for you.
            </p>
          </div>
        )}

        {messages?.map(
          (msg: { _id: string; role: string; content: string }) => (
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
          )
        )}

        {/* Blueprint info card — informational only, no approval buttons */}
        {blueprint && <BlueprintCard blueprint={blueprint} />}

        {/* Status indicators */}
        {isGenerating && (
          <div className="mt-2 animate-pulse text-sm text-muted-foreground">
            Building your app...
          </div>
        )}

        {isLive && (
          <div className="mt-2 text-sm text-green-600">
            App is live and ready!
          </div>
        )}

        {error && (
          <div className="mt-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </ScrollArea>

      {/* Prompt input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isLive ? "Request changes..." : "Describe your therapy tool..."
            }
            disabled={isGenerating}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isGenerating}>
            {isLive ? "Send" : "Build"}
          </Button>
        </div>
      </form>
    </div>
  );
}
