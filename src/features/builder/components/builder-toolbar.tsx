"use client";

import Link from "next/link";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

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
          <button
            onClick={onNewChat}
            className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-surface-container-high text-on-surface-variant transition-all hover:bg-surface-container-highest hover:text-primary active:scale-90"
            aria-label="New chat"
            title="Start a new app"
          >
            <MaterialIcon icon="add" size="xs" />
          </button>
        )}

        <h1 className="min-w-0 max-w-[180px]">
          {isEditingName ? (
            <input
              autoFocus
              defaultValue={projectName}
              maxLength={100}
              aria-label="Project name"
              className="w-full truncate border-b border-primary/50 bg-transparent text-[13px] font-semibold tracking-tight text-primary outline-none"
              onBlur={(e) => onNameEditEnd?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onNameEditEnd?.((e.target as HTMLInputElement).value);
                if (e.key === "Escape") onNameEditEnd?.(projectName);
              }}
            />
          ) : (
            <button
              onClick={onNameEditStart}
              className="block max-w-full truncate text-[13px] font-semibold tracking-tight text-primary transition-all hover:underline hover:underline-offset-2"
              title="Click to rename"
            >
              {projectName}
            </button>
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
        <div className="flex items-center rounded-lg bg-surface-container-high p-1" role="tablist">
          <button
            role="tab"
            aria-selected={mobilePanel === "chat"}
            onClick={() => onMobilePanelChange("chat")}
            className={cn(
              "min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
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
              "min-h-[44px] rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              mobilePanel === "preview"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Preview
          </button>
        </div>
      )}

      {/* Center section: View toggle + Device sizes + URL bar (desktop) */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex">
        {/* Segmented control: Preview / Source toggle */}
        <div className="flex items-center rounded-lg bg-surface-container-high p-1" role="tablist">
          <button
            role="tab"
            aria-selected={view === "preview"}
            onClick={() => onViewChange("preview")}
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              view === "preview"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Preview
          </button>
          <button
            role="tab"
            aria-selected={view === "code"}
            onClick={() => onViewChange("code")}
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300",
              view === "code"
                ? "bg-white text-primary shadow-sm dark:bg-surface-container-lowest"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Source
          </button>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-outline-variant/30" />

        {/* Device size icons */}
        <div className="flex items-center gap-1">
          {DEVICE_OPTIONS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => onDeviceSizeChange(key)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 transition-all active:scale-95",
                deviceSize === key
                  ? "bg-surface-container-high text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              )}
              aria-label={label}
              title={label}
            >
              <MaterialIcon icon={icon} size="sm" />
            </button>
          ))}
        </div>

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
