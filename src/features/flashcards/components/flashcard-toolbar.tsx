"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { FlashcardStreamingStatus } from "../hooks/use-flashcard-streaming";

interface FlashcardToolbarProps {
  status: FlashcardStreamingStatus;
  projectName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  onShare?: () => void;
  onNewChat?: () => void;
  onOpenDeckSheet?: () => void;
  isMobile?: boolean;
  mobilePanel?: "chat" | "preview";
  onMobilePanelChange?: (panel: "chat" | "preview") => void;
}

export function FlashcardToolbar({
  status,
  projectName,
  isEditingName,
  onNameEditStart,
  onNameEditEnd,
  onShare,
  onNewChat,
  onOpenDeckSheet,
  isMobile,
  mobilePanel,
  onMobilePanelChange,
}: FlashcardToolbarProps) {
  const isGenerating = status === "generating";

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between bg-surface-container-lowest px-3 shadow-sm">
      {/* Left section: Back + New Chat + Name + Status */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-primary-container to-primary text-white transition-transform active:scale-90"
          aria-label="Back to dashboard"
        >
          <MaterialIcon icon="arrow_back" size="xs" />
        </Link>

        {onNewChat && (
          <button
            onClick={onNewChat}
            className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-surface-container-high text-on-surface-variant transition-all hover:bg-surface-container-highest hover:text-primary active:scale-90"
            aria-label="New deck"
            title="Start a new deck"
          >
            <MaterialIcon icon="add" size="xs" />
          </button>
        )}

        <h1 className="contents">
          {isEditingName ? (
            <input
              autoFocus
              defaultValue={projectName}
              maxLength={100}
              aria-label="Deck name"
              className="w-[160px] truncate border-b border-primary/50 bg-transparent text-[13px] font-semibold tracking-tight text-primary outline-none"
              onBlur={(e) => onNameEditEnd?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onNameEditEnd?.((e.target as HTMLInputElement).value);
                if (e.key === "Escape") onNameEditEnd?.(projectName);
              }}
            />
          ) : (
            <button
              onClick={onNameEditStart}
              className="truncate text-[13px] font-semibold tracking-tight text-primary transition-all hover:underline hover:underline-offset-2"
              title="Click to rename"
            >
              {projectName}
            </button>
          )}
        </h1>

        {isGenerating && (
          <div className="hidden items-center gap-2 rounded-full bg-surface-container-low px-2 py-1 sm:flex">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
            </span>
            <span className="text-xs font-medium text-on-surface-variant/70">
              Generating cards&#8230;
            </span>
          </div>
        )}
      </div>

      {/* Center section: Mobile panel toggle */}
      {isMobile && onMobilePanelChange && (
        <div className="flex items-center rounded-lg bg-surface-container-high p-1" role="tablist">
          <button
            role="tab"
            aria-selected={mobilePanel === "chat"}
            onClick={() => onMobilePanelChange("chat")}
            className={cn(
              "min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-200",
              mobilePanel === "chat"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Chat
          </button>
          <button
            role="tab"
            aria-selected={mobilePanel === "preview"}
            onClick={() => onMobilePanelChange("preview")}
            className={cn(
              "min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-200",
              mobilePanel === "preview"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Cards
          </button>
        </div>
      )}

      {/* Right section: Decks + Share */}
      <div className="flex items-center gap-1">
        {onOpenDeckSheet && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
            onClick={onOpenDeckSheet}
          >
            <MaterialIcon icon="collections_bookmark" size="sm" />
            <span className="hidden sm:inline">Decks</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
          onClick={onShare}
        >
          <MaterialIcon icon="share" size="sm" />
          Share
        </Button>
      </div>
    </header>
  );
}
