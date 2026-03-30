"use client";

import { cn } from "@/core/utils";

interface MessageBubbleProps {
  content: string;
  senderRole: "slp" | "caregiver";
  timestamp: number;
  readAt?: number;
  isOwnMessage: boolean;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return timeStr;

  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${dateStr}, ${timeStr}`;
}

export function MessageBubble({
  content,
  senderRole,
  timestamp,
  readAt,
  isOwnMessage,
}: MessageBubbleProps) {
  const roleLabel = senderRole === "slp" ? "Therapist" : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isOwnMessage ? "items-end" : "items-start"
      )}
    >
      {/* Role label — only for messages from the other party */}
      {!isOwnMessage && roleLabel && (
        <span className="px-1 text-xs font-medium text-muted-foreground">
          {roleLabel}
        </span>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed",
          "rounded-2xl",
          isOwnMessage
            ? "rounded-br-sm bg-[linear-gradient(135deg,#00595c,#0d7377)] text-white"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {content}
      </div>

      {/* Timestamp + read receipt */}
      <div
        className={cn(
          "flex items-center gap-1 px-1 text-xs text-muted-foreground",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}
      >
        <span>{formatTimestamp(timestamp)}</span>
        {isOwnMessage && readAt !== undefined && (
          <span aria-label="Read" className="text-xs text-muted-foreground">
            ✓✓
          </span>
        )}
      </div>
    </div>
  );
}
