"use client";

import { Loader2, Sparkles } from "lucide-react";

import { cn } from "@/core/utils";

import type { WebContainerStatus } from "../hooks/use-webcontainer";
import type { DeviceSize } from "./builder-toolbar";

interface PreviewPanelProps {
  previewUrl: string | null;
  state: string;
  wcStatus: WebContainerStatus;
  error?: string;
  deviceSize?: DeviceSize;
}

export function PreviewPanel({ previewUrl, state, wcStatus, error, deviceSize = "desktop" }: PreviewPanelProps) {
  const isGenerating = state === "generating";
  const isFailed = state === "failed" || wcStatus === "error";
  const hasPreview = wcStatus === "ready" && !!previewUrl;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-surface-container-low/30 p-4">
        {hasPreview ? (
          <div className={cn(
            "h-full overflow-hidden rounded-2xl shadow-lg transition-all duration-300",
            deviceSize === "mobile" ? "w-[375px]" : "w-full"
          )}>
            <iframe
              src={previewUrl!}
              className="h-full w-full bg-white"
              title="App Preview"
              sandbox="allow-scripts"
            />
          </div>
        ) : wcStatus === "booting" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-48 w-72 animate-pulse rounded-2xl bg-surface-container-low" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-surface-container-low" />
          </div>
        ) : wcStatus === "installing" || isGenerating ? (
          <div role="status" className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">Setting up your preview...</p>
          </div>
        ) : isFailed ? (
          <div className="text-center text-sm">
            <p className="text-destructive">
              {error ?? "Something went wrong. Please try again."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Sparkles className="h-8 w-8 text-outline-variant/40" />
            <p className="text-sm text-on-surface-variant">Your app will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
