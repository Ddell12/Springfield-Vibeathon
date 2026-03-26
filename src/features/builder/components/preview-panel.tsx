"use client";

import { AlertCircle, Loader2, Monitor, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/core/utils";

import type { StreamingStatus } from "../hooks/use-streaming";

type DeviceSize = "desktop" | "mobile";

interface PreviewPanelProps {
  bundleHtml: string | null;
  state: StreamingStatus;
  error?: string;
  deviceSize?: DeviceSize;
}

export function PreviewPanel({ bundleHtml, state, error, deviceSize = "desktop" }: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const blobUrl = useMemo(() => {
    if (!bundleHtml) return null;
    void refreshKey; // dependency trigger — incrementing forces a new blob URL
    const blob = new Blob([bundleHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [bundleHtml, refreshKey]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const hasPreview = !!blobUrl;
  const isGenerating = state === "generating";
  const isFailed = state === "failed";

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30">
      {hasPreview && (
        <iframe
          title="App preview"
          src={blobUrl}
          sandbox="allow-scripts allow-same-origin"
          className={cn(
            "h-full border-0 bg-white transition-all duration-300",
            deviceSize === "mobile" ? "w-[375px] rounded-2xl shadow-xl" : "w-full",
          )}
        />
      )}

      {isGenerating && !hasPreview && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Building your app...</p>
        </div>
      )}

      {isGenerating && hasPreview && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-4 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error ?? "Something went wrong"}</p>
        </div>
      )}

      {!hasPreview && !isGenerating && !isFailed && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Monitor className="h-12 w-12 opacity-20" />
          <p className="text-sm">Your app will appear here</p>
        </div>
      )}

      {/* Reload button */}
      {hasPreview && !isGenerating && (
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="absolute top-3 right-3 rounded-lg bg-background/80 p-2 shadow-md backdrop-blur-sm transition-all hover:bg-background active:scale-95"
          title="Reload preview"
          aria-label="Reload preview"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
