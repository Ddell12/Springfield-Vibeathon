"use client";

import { AlertCircle, Loader2, Monitor, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/core/utils";

import type { StreamingStatus } from "../hooks/use-streaming";

type DeviceSize = "desktop" | "mobile";

interface PreviewPanelProps {
  bundleHtml: string | null;
  state: StreamingStatus;
  error?: string;
  deviceSize?: DeviceSize;
  buildFailed?: boolean;
}

export function PreviewPanel({ bundleHtml, state, error, deviceSize = "desktop", buildFailed = false }: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  // Track which blobUrl the iframe has finished loading — null means "not yet loaded"
  const [loadedBlobUrl, setLoadedBlobUrl] = useState<string | null>(null);

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

      {!hasPreview && !isGenerating && !isFailed && state === "live" && (
        <div className="flex flex-col items-center gap-3 text-amber-600">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">
            {buildFailed ? "Preview build failed" : "Build could not produce a preview"}
          </p>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            {buildFailed
              ? "The generated code had build errors. Try sending a follow-up message like \"fix the build errors\" to resolve."
              : "Check the Code panel for your generated files."}
          </p>
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
