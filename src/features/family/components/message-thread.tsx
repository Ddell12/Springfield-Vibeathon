"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useMessages } from "../hooks/use-messages";
import { MessageBubble } from "./message-bubble";

interface MessageThreadProps {
  paramsPromise: Promise<{ patientId: string }>;
}

export function MessageThread({ paramsPromise }: MessageThreadProps) {
  const { patientId: patientIdStr } = use(paramsPromise);
  const patientId = patientIdStr as Id<"patients">;

  const { user } = useUser();
  const { messages, sendMessage, markRead } = useMessages(patientId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<Set<string>>(new Set());

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark unread messages from the other party as read
  useEffect(() => {
    if (!messages || !user) return;

    for (const msg of messages) {
      if (
        msg.senderUserId !== user.id &&
        msg.readAt === undefined &&
        !markedRef.current.has(msg._id)
      ) {
        markedRef.current.add(msg._id);
        markRead({ messageId: msg._id as Id<"patientMessages"> }).catch(
          () => {
            // Non-critical — ignore
          }
        );
      }
    }
  }, [messages, user, markRead]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInput("");
    try {
      await sendMessage({ patientId, content: trimmed });
    } catch {
      toast.error("Couldn't send message. Please try again.");
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // API returns desc order — reverse to display oldest-first
  const sortedMessages = messages ? [...messages].reverse() : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/family/${patientIdStr}`} aria-label="Back to patient">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-headline text-lg font-semibold">Messages</h1>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sortedMessages === undefined ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedMessages.map((msg) => (
              <MessageBubble
                key={msg._id}
                content={msg.content}
                senderRole={msg.senderRole as "slp" | "caregiver"}
                timestamp={msg.timestamp}
                readAt={msg.readAt}
                isOwnMessage={msg.senderUserId === user?.id}
              />
            ))}
            <div ref={scrollEndRef} />
          </div>
        )}
      </div>

      {/* Compose bar */}
      <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isSending}
            className="flex-1"
            aria-label="Message input"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending}
            size="icon"
            aria-label="Send message"
            className={cn(
              "shrink-0 text-white",
              "bg-primary-gradient",
              "hover:opacity-90 transition-opacity duration-300",
              (!input.trim() || isSending) && "opacity-50"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
