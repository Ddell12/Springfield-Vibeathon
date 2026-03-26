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
  isPublishing: boolean;
  projectName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  onShare?: () => void;
  onPublish?: () => void;
  onNewChat?: () => void;
  isMobile?: boolean;
  mobilePanel?: "chat" | "preview";
  onMobilePanelChange?: (panel: "chat" | "preview") => void;
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
  isPublishing,
  projectName,
  isEditingName,
  onNameEditStart,
  onNameEditEnd,
  onShare,
  onPublish,
  onNewChat,
  isMobile,
  mobilePanel,
  onMobilePanelChange,
}: BuilderToolbarProps) {
  const isGenerating = status === "generating";
  const canPublish = !isGenerating && !isPublishing;

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between bg-surface-container-lowest px-3 shadow-sm">
      {/* Left section: Back + Project Name + Status */}
      <div className="flex items-center gap-3">
        {/* Gradient back button */}
        <Link
          href="/dashboard"
          className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-primary-container to-primary text-white transition-transform active:scale-90"
          aria-label="Back to dashboard"
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

        <h1 className="contents">
          {isEditingName ? (
            <input
              autoFocus
              defaultValue={projectName}
              maxLength={100}
              aria-label="Project name"
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

        {/* Status indicator pill */}
        {isGenerating && (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-surface-container-low px-2 py-1">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
            </span>
            <span className="text-xs font-medium text-on-surface-variant/70">
              Loading Live Preview&#8230;
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
            Preview
          </button>
        </div>
      )}

      {/* Center section: View toggle + Device sizes + URL bar (desktop) */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-3">
        {/* Segmented control */}
        <div className="flex items-center rounded-lg bg-surface-container-high p-1" role="tablist">
          <button
            role="tab"
            aria-selected={view === "preview"}
            onClick={() => onViewChange("preview")}
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-200",
              view === "preview"
                ? "bg-white text-primary shadow-sm"
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
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-200",
              view === "code"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Code
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
            >
              <MaterialIcon icon={icon} size="sm" />
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-outline-variant/30" />

        <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 min-w-[120px]">
          <MaterialIcon icon="language" className="text-sm text-outline" />
          <span className="truncate text-xs font-medium text-outline">{projectName}</span>
        </div>
      </div>

      {/* Right section: Share + Publish */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
          onClick={onShare}
        >
          <MaterialIcon icon="share" size="sm" />
          Share
        </Button>
        <Button
          size="sm"
          className="min-h-[44px] rounded-lg bg-primary-container px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onPublish}
          disabled={!canPublish}
        >
          {isPublishing ? <MaterialIcon icon="progress_activity" size="xs" className="animate-spin" /> : "Publish"}
        </Button>
      </div>
    </header>
  );
}
