"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";

import type { StreamingStatus } from "../hooks/use-streaming";

export type DeviceSize = "mobile" | "desktop";
export type ViewMode = "preview" | "code";

interface BuilderToolbarProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  deviceSize: DeviceSize;
  onDeviceSizeChange: (size: DeviceSize) => void;
  status: StreamingStatus;
  projectName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  onShare?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  onNewChat?: () => void;
  isMobile?: boolean;
  mobilePanel?: "chat" | "preview";
  onMobilePanelChange?: (panel: "chat" | "preview") => void;
  hasFiles?: boolean;
  onFullscreen?: () => void;
}

const DEVICE_OPTIONS: { key: DeviceSize; icon: string; label: string }[] = [
  { key: "mobile", icon: "smartphone", label: "Mobile" },
  { key: "desktop", icon: "desktop_windows", label: "Desktop" },
];

export function BuilderToolbar({
  view,
  onViewChange,
  deviceSize,
  onDeviceSizeChange,
  status,
  projectName,
  isEditingName,
  onNameEditStart,
  onNameEditEnd,
  onShare,
  onSave,
  isSaved,
  onNewChat,
  isMobile,
  mobilePanel,
  onMobilePanelChange,
  hasFiles,
  onFullscreen,
}: BuilderToolbarProps) {
  const isGenerating = status === "generating";

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between bg-surface-container-lowest px-3 shadow-sm">
      {/* Left section: Back + Project Name + Status */}
      <div className="flex min-w-0 flex-shrink items-center gap-3">
        {/* Gradient back button */}
        <Link
          href="/dashboard"
          className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-primary-container to-primary text-white transition-transform active:scale-90"
          aria-label="Back to dashboard"
          title="Back to dashboard"
        >
          <MaterialIcon icon="arrow_back" size="xs" />
        </Link>

        {onNewChat && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="min-h-[44px] min-w-[44px] flex-shrink-0 rounded bg-surface-container-high text-on-surface-variant transition-all hover:bg-surface-container-highest hover:text-primary active:scale-90"
            aria-label="New chat"
            title="Start a new app"
          >
            <MaterialIcon icon="add" size="xs" />
          </Button>
        )}

        <h1 className="min-w-0 max-w-[180px]">
          {isEditingName ? (
            <Input
              autoFocus
              defaultValue={projectName}
              maxLength={100}
              aria-label="Project name"
              className="h-auto rounded-none border-0 border-b-2 border-b-primary/50 bg-transparent px-0 py-0 text-[13px] font-semibold tracking-tight text-primary outline-none focus-visible:border-transparent focus-visible:border-b-primary focus-visible:bg-transparent"
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
              className="block h-auto max-w-full truncate px-0 text-[13px] font-semibold tracking-tight text-primary no-underline transition-all hover:underline hover:underline-offset-2"
              title="Click to rename"
            >
              {projectName}
            </Button>
          )}
        </h1>

        {/* Status indicator pill */}
        {isGenerating && (
          <div className="hidden sm:flex flex-shrink-0 items-center gap-2 rounded-full bg-surface-container-low px-2 py-1">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
            </span>
            <span className="text-xs font-medium text-on-surface-variant/70">
              Building your app&#8230;
            </span>
          </div>
        )}
      </div>

      {/* Center section: Mobile panel toggle (< lg) */}
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
              "min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              mobilePanel === "chat"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "bg-transparent text-on-surface-variant hover:text-primary"
            )}
          >
            Chat
          </ToggleGroupItem>
          <ToggleGroupItem
            value="preview"
            aria-label="Preview"
            className={cn(
              "min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              mobilePanel === "preview"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "bg-transparent text-on-surface-variant hover:text-primary"
            )}
          >
            Preview
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {/* Center section: View toggle + Device sizes + URL bar (desktop) */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex">
        {/* Segmented control: Preview / Source toggle */}
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => {
            if (value) onViewChange(value as ViewMode);
          }}
          className="rounded-lg bg-surface-container-high p-1"
        >
          <ToggleGroupItem
            value="preview"
            aria-label="Preview"
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              view === "preview"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "bg-transparent text-on-surface-variant hover:text-primary"
            )}
          >
            Preview
          </ToggleGroupItem>
          <ToggleGroupItem
            value="code"
            aria-label="Source"
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              view === "code"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "bg-transparent text-on-surface-variant hover:text-primary"
            )}
          >
            Source
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Separator */}
        <div className="h-4 w-px bg-outline-variant/30" />

        {/* Device size icons */}
        <ToggleGroup
          type="single"
          value={deviceSize}
          onValueChange={(value) => {
            if (value) onDeviceSizeChange(value as DeviceSize);
          }}
          className="gap-1"
        >
          {DEVICE_OPTIONS.map(({ key, icon, label }) => (
            <ToggleGroupItem
              key={key}
              value={key}
              aria-label={label}
              title={label}
              className={cn(
                "min-h-[44px] min-w-[44px] rounded-md p-1.5 transition-all active:scale-95",
                deviceSize === key
                  ? "bg-surface-container-high text-primary"
                  : "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              )}
            >
              <MaterialIcon icon={icon} size="sm" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Separator */}
        <div className="h-4 w-px bg-outline-variant/30" />

        <div className="flex min-w-0 max-w-[200px] items-center gap-2 rounded-full bg-surface-container-low px-3 py-1">
          <MaterialIcon icon="language" className="flex-shrink-0 text-sm text-outline" />
          <span className="truncate text-xs font-medium text-outline">{projectName}</span>
        </div>
      </div>

      {/* Right section: Fullscreen + Share */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {!isGenerating && hasFiles && onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
            onClick={onFullscreen}
            aria-label="Fullscreen"
            title="View app fullscreen"
          >
            <MaterialIcon icon="fullscreen" size="sm" />
            <span className="hidden sm:inline">Fullscreen</span>
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
