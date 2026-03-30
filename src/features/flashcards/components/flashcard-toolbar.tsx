"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";

import type { FlashcardStreamingStatus } from "../hooks/use-flashcard-streaming";

interface FlashcardToolbarProps {
  status: FlashcardStreamingStatus;
  projectName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  onShare?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
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
  onSave,
  isSaved,
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="min-h-[44px] min-w-[44px] flex-shrink-0 rounded bg-surface-container-high text-on-surface-variant transition-all hover:bg-surface-container-highest hover:text-primary active:scale-90"
            aria-label="New deck"
            title="Start a new deck"
          >
            <MaterialIcon icon="add" size="xs" />
          </Button>
        )}

        <h1 className="contents">
          {isEditingName ? (
            <Input
              autoFocus
              defaultValue={projectName}
              maxLength={100}
              aria-label="Deck name"
              className="h-auto w-[160px] truncate rounded-none border-0 border-b border-primary/50 bg-transparent px-0 py-0 text-[13px] font-semibold tracking-tight text-primary shadow-none outline-none ring-0 focus-visible:ring-0"
              onBlur={(e) => onNameEditEnd?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onNameEditEnd?.((e.target as HTMLInputElement).value);
                if (e.key === "Escape") onNameEditEnd?.(projectName);
              }}
            />
          ) : (
            <Button
              variant="link"
              size="sm"
              onClick={onNameEditStart}
              className="h-auto truncate px-0 text-[13px] font-semibold tracking-tight text-primary no-underline transition-all hover:underline hover:underline-offset-2"
              title="Click to rename"
            >
              {projectName}
            </Button>
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
            className="min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold text-on-surface-variant transition-colors duration-200 hover:text-primary data-[state=on]:bg-white data-[state=on]:text-primary data-[state=on]:shadow-sm dark:data-[state=on]:bg-surface-container-lowest"
          >
            Chat
          </ToggleGroupItem>
          <ToggleGroupItem
            value="preview"
            className="min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold text-on-surface-variant transition-colors duration-200 hover:text-primary data-[state=on]:bg-white data-[state=on]:text-primary data-[state=on]:shadow-sm dark:data-[state=on]:bg-surface-container-lowest"
          >
            Cards
          </ToggleGroupItem>
        </ToggleGroup>
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
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold transition-all active:scale-95",
              isSaved ? "text-primary" : "text-on-surface-variant",
            )}
            onClick={onSave}
            disabled={isSaved}
          >
            <MaterialIcon icon={isSaved ? "check_circle" : "bookmark"} size="sm" />
            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
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
