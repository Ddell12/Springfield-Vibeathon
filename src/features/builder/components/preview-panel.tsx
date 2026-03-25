"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";

interface PreviewPanelProps {
  session: {
    previewUrl?: string;
    state: string;
    stateMessage?: string;
  } | null | undefined;
}

const RESPONSIVE_SIZES = [
  { label: "Mobile", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: "100%" as const },
];

export function PreviewPanel({ session }: PreviewPanelProps) {
  const [sizeIndex, setSizeIndex] = useState(2); // Default: desktop
  const [iframeError, setIframeError] = useState(false);
  const currentSize = RESPONSIVE_SIZES[sizeIndex];

  const isDeploying = session?.state === "deploying";
  const hasPreview = !!session?.previewUrl;

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
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30 p-4">
        <AnimatePresence mode="wait">
          {isDeploying ? (
            <motion.div
              key="deploying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="animate-pulse text-sm text-muted-foreground"
            >
              Deploying to preview...
            </motion.div>
          ) : hasPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative h-full"
              style={{
                width:
                  typeof currentSize.width === "number"
                    ? `${currentSize.width}px`
                    : "100%",
                maxWidth: "100%",
              }}
            >
              <iframe
                src={session!.previewUrl}
                className="h-full w-full rounded-lg border bg-white shadow-sm"
                title="App Preview"
                sandbox="allow-scripts allow-same-origin"
                onError={() => setIframeError(true)}
                onLoad={() => setIframeError(false)}
              />
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                      cloud_off
                    </span>
                    <p className="text-sm text-on-surface-variant">
                      Preview connection lost. Rebuilding...
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center text-sm text-muted-foreground"
            >
              <p>Your app preview will appear here.</p>
              {session?.stateMessage && (
                <p className="mt-1 text-xs">{session.stateMessage}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
