"use client";

import { AlertCircle, Loader2, Monitor, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { StreamingStatus } from "../hooks/use-streaming";
import { useTtsBridge } from "../hooks/use-tts-bridge";

type DeviceSize = "desktop" | "mobile";

interface PreviewPanelProps {
  bundleHtml: string | null;
  state: StreamingStatus;
  error?: string;
  deviceSize?: DeviceSize;
  buildFailed?: boolean;
  activityMessage?: string;
  onRetry?: () => void;
}

export function PreviewPanel({ bundleHtml, state, error, deviceSize = "desktop", buildFailed = false, activityMessage, onRetry }: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  // Track which blobUrl the iframe has finished loading — null means "not yet loaded"
  const [loadedBlobUrl, setLoadedBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Bridge TTS requests from iframe to ElevenLabs via Convex
  useTtsBridge(iframeRef);

  const blobUrl = useMemo(() => {
    if (!bundleHtml) return null;
    void refreshKey; // dependency trigger — incrementing forces a new blob URL
    const blob = new Blob([bundleHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [bundleHtml, refreshKey]);

  // Derive readiness: iframe is ready when we've loaded the current blobUrl
  const iframeReady = loadedBlobUrl !== null && loadedBlobUrl === blobUrl;

  // Delay revocation of previous blob URL so iframe finishes loading the new one
  const prevBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const prevUrl = prevBlobUrlRef.current;
    prevBlobUrlRef.current = blobUrl;
    if (prevUrl && prevUrl !== blobUrl) {
      const timer = setTimeout(() => URL.revokeObjectURL(prevUrl), 200);
      return () => clearTimeout(timer);
    }
  }, [blobUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current);
    };
  }, []);

  const hasPreview = !!blobUrl;
  const isGenerating = state === "generating";
  const isFailed = state === "failed";

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30">
      {hasPreview && (
        <>
          <iframe
            ref={iframeRef}
            title="App preview"
            src={blobUrl}
            onLoad={() => setLoadedBlobUrl(blobUrl)}
            // allow-same-origin is required: blob: URLs need same-origin context for
            // inline scripts to execute. CSP meta tag in bundle.html restricts capabilities
            // (no fetch, no nested frames, no form submissions). See inline-bundle.cjs.
            sandbox="allow-scripts allow-same-origin"
            className={cn(
              "h-full border-0 bg-white transition-all duration-300",
              deviceSize === "mobile" ? "w-[375px] rounded-2xl shadow-xl" : "w-full",
            )}
          />
          {!iframeReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}

      {isGenerating && !hasPreview && (
        <div className="flex flex-col items-center gap-5 text-muted-foreground max-w-xs text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          <div>
            <p className="text-sm font-medium">Creating your app...</p>
            {activityMessage && (
              <p className="mt-1.5 text-xs text-muted-foreground/60 animate-pulse">
                {activityMessage}
              </p>
            )}
          </div>
          {/* Skeleton wireframe */}
          <div className="w-full space-y-3 rounded-xl border border-border/30 bg-background/50 p-5">
            <div className="h-3 w-1/2 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-8 w-full rounded-lg bg-muted/40 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-md bg-muted/50 animate-pulse" />
              <div className="h-6 w-20 rounded-md bg-muted/50 animate-pulse" />
            </div>
            <div className="h-24 w-full rounded-lg bg-muted/30 animate-pulse" />
          </div>
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
          <p className="text-sm font-medium">Something didn&apos;t look right</p>
        </div>
      )}

      {!hasPreview && !isGenerating && !isFailed && state === "live" && (
        <div className="flex flex-col items-center gap-3 text-amber-600">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">Something didn&apos;t look right</p>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            Want to try again? Just tap the button below.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
        </div>
      )}

      {!hasPreview && !isGenerating && !isFailed && state !== "live" && (
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
