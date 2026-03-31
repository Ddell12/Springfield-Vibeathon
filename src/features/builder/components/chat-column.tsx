"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Input } from "@/shared/components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";

import type { Id } from "../../../../convex/_generated/dataModel";
import type { Activity, StreamingStatus } from "../hooks/use-streaming";
import type { TherapyBlueprint } from "../lib/schemas";
import { ChatPanel } from "./chat-panel";
import { InputBar } from "./input-bar";
import { PatientContextCard } from "./patient-context-card";

interface ChatColumnProps {
  sessionId: string | null;
  status: StreamingStatus;
  blueprint: TherapyBlueprint | null;
  error: string | null;
  onGenerate: (prompt: string) => void;
  onRetry?: () => void;
  streamingText: string;
  activities: Activity[];
  pendingPrompt?: string | null;
  onPendingPromptClear?: () => void;
  narrationMessage?: string | null;
  appName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  patientId?: Id<"patients"> | null;
  isMobile?: boolean;
  mobilePanel?: "chat" | "preview";
  onMobilePanelChange?: (panel: "chat" | "preview") => void;
  onArtifactClick?: () => void;
}

export function ChatColumn({
  sessionId,
  status,
  blueprint,
  error,
  onGenerate,
  onRetry,
  streamingText,
  activities,
  pendingPrompt,
  onPendingPromptClear,
  narrationMessage,
  appName,
  isEditingName,
  onNameEditStart,
  onNameEditEnd,
  patientId,
  isMobile,
  mobilePanel,
  onMobilePanelChange,
  onArtifactClick,
}: ChatColumnProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;
    onGenerate(value.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center gap-3 border-b border-outline-variant/20 px-4">
        <MaterialIcon
          icon="menu"
          size="sm"
          className="shrink-0 text-on-surface-variant/50"
        />

        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <Input
              autoFocus
              defaultValue={appName}
              maxLength={100}
              aria-label="App name"
              className="h-auto rounded-none border-0 border-b-2 border-b-primary/50 bg-transparent px-0 py-0 text-[13px] font-semibold tracking-tight text-primary outline-none focus-visible:border-transparent focus-visible:border-b-primary focus-visible:bg-transparent"
              onBlur={(e) => onNameEditEnd?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onNameEditEnd?.((e.target as HTMLInputElement).value);
                if (e.key === "Escape") onNameEditEnd?.(appName);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onNameEditStart}
              className="flex items-center gap-1 truncate text-[13px] font-semibold tracking-tight text-foreground hover:text-primary"
              title="Click to rename"
            >
              <span className="truncate">{appName}</span>
              <MaterialIcon icon="expand_more" size="xs" className="shrink-0 text-on-surface-variant/40" />
            </button>
          )}
        </div>

        {/* Mobile panel toggle */}
        {isMobile && onMobilePanelChange && (
          <ToggleGroup
            type="single"
            value={mobilePanel}
            onValueChange={(value) => {
              if (value) onMobilePanelChange(value as "chat" | "preview");
            }}
            className="rounded-lg bg-surface-container-high p-1"
          >
            <ToggleGroupItem
              value="chat"
              aria-label="Chat"
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
                mobilePanel === "chat"
                  ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                  : "bg-transparent text-on-surface-variant hover:text-primary",
              )}
            >
              Chat
            </ToggleGroupItem>
            <ToggleGroupItem
              value="preview"
              aria-label="Preview"
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
                mobilePanel === "preview"
                  ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                  : "bg-transparent text-on-surface-variant hover:text-primary",
              )}
            >
              Preview
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {/* Patient context */}
      {patientId ? <PatientContextCard patientId={patientId} /> : null}

      {/* Messages */}
      <ChatPanel
        sessionId={sessionId}
        status={status}
        blueprint={blueprint}
        error={error}
        onRetry={onRetry}
        streamingText={streamingText}
        activities={activities}
        pendingPrompt={pendingPrompt}
        onPendingPromptClear={onPendingPromptClear}
        narrationMessage={narrationMessage}
        appTitle={appName}
        onArtifactClick={onArtifactClick}
      />

      {/* Sticky input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <InputBar
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder={
            status === "live"
              ? "Reply to Bridges AI\u2026"
              : "What would you like to build\u2026"
          }
          isGenerating={status === "generating"}
          showGuidedPill
        />
      </div>
    </div>
  );
}
