"use client";

import {
  ArrowLeft,
  Globe,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/core/utils";
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
  onShare?: () => void;
  onPublish?: () => void;
}

const DEVICE_OPTIONS: { key: DeviceSize; icon: typeof Smartphone; label: string }[] = [
  { key: "mobile", icon: Smartphone, label: "Mobile" },
  { key: "desktop", icon: Monitor, label: "Desktop" },
];

export function BuilderToolbar({
  view,
  onViewChange,
  deviceSize,
  onDeviceSizeChange,
  status,
  projectName,
  onShare,
  onPublish,
}: BuilderToolbarProps) {
  const isGenerating = status === "generating";

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between bg-surface-container-lowest px-3 shadow-sm">
      {/* Left section: Back + Project Name + Status */}
      <div className="flex items-center gap-3">
        {/* Gradient back button */}
        <Link
          href="/dashboard"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-primary-container to-primary text-white transition-transform active:scale-90"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <span className="truncate text-[13px] font-semibold tracking-tight text-primary">
          {projectName}
        </span>

        {/* Status indicator pill */}
        {isGenerating && (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-surface-container-low px-2 py-1">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />
            </span>
            <span className="text-xs font-medium text-on-surface-variant/70">
              Loading Live Preview...
            </span>
          </div>
        )}
      </div>

      {/* Center section: View toggle + Device sizes + URL bar */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-3">
        {/* Segmented control */}
        <div className="flex items-center rounded-lg bg-surface-container-high p-1">
          <button
            onClick={() => onViewChange("preview")}
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-all duration-200",
              view === "preview"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            Preview
          </button>
          <button
            onClick={() => onViewChange("code")}
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-semibold transition-all duration-200",
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
          {DEVICE_OPTIONS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => onDeviceSizeChange(key)}
              className={cn(
                "rounded-md p-1.5 transition-all active:scale-95",
                deviceSize === key
                  ? "bg-surface-container-high text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              )}
              aria-label={label}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-outline-variant/30" />

        <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 min-w-[120px]">
          <Globe className="h-3.5 w-3.5 text-outline" />
          <span className="truncate text-xs font-medium text-outline">{projectName}</span>
        </div>
      </div>

      {/* Right section: Share + Publish */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
          onClick={onShare}
        >
          <Share2 className="h-[18px] w-[18px]" />
          Share
        </Button>
        <Button
          size="sm"
          className="h-8 rounded-lg bg-primary-container px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-primary active:scale-95"
          onClick={onPublish}
        >
          Publish
        </Button>
      </div>
    </header>
  );
}
