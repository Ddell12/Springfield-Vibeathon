"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";

import type { WebContainerStatus } from "../hooks/use-webcontainer";

interface PreviewPanelProps {
  previewUrl: string | null;
  state: string;
  wcStatus: WebContainerStatus;
  error?: string;
}

const RESPONSIVE_SIZES = [
  { label: "Mobile", width: 375 },
  { label: "Desktop", width: "100%" as const },
];

export function PreviewPanel({ previewUrl, state, wcStatus, error }: PreviewPanelProps) {
  const [sizeIndex, setSizeIndex] = useState(1); // Default: desktop
  const currentSize = RESPONSIVE_SIZES[sizeIndex];

  const isGenerating = state === "generating";
  const isFailed = state === "failed" || wcStatus === "error";
  const hasPreview = wcStatus === "ready" && !!previewUrl;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
        <div className="flex gap-1">
          {RESPONSIVE_SIZES.map((size, i) => (
            <Button
              key={size.label}
              variant={sizeIndex === i ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSizeIndex(i)}
              aria-label={size.label}
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30 p-4">
        {hasPreview ? (
          <iframe
            src={previewUrl!}
            className="h-full rounded-lg border bg-white shadow-sm"
            style={{
              width:
                typeof currentSize.width === "number"
                  ? `${currentSize.width}px`
                  : "100%",
              maxWidth: "100%",
            }}
            title="App Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : wcStatus === "booting" ? (
          <div className="text-center text-sm text-muted-foreground">
            <p>Booting preview environment...</p>
          </div>
        ) : wcStatus === "installing" || isGenerating ? (
          <div role="status" className="animate-pulse text-center text-sm text-muted-foreground">
            <p>Installing dependencies...</p>
          </div>
        ) : isFailed ? (
          <div className="text-center text-sm">
            <p className="text-destructive">
              {error ?? "Something went wrong. Please try again."}
            </p>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>Your preview will appear here once your app is built.</p>
          </div>
        )}
      </div>
    </div>
  );
}
