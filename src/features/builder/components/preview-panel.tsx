"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/core/utils";

interface PreviewPanelProps {
  session: {
    previewUrl?: string;
    state: string;
    stateMessage?: string;
  } | null | undefined;
}

const RESPONSIVE_SIZES = [
  { label: "Mobile", width: 375, icon: "smartphone" },
  { label: "Tablet", width: 768, icon: "tablet" },
  { label: "Desktop", width: "100%" as const, icon: "monitor" },
];

export function PreviewPanel({ session }: PreviewPanelProps) {
  const [sizeIndex, setSizeIndex] = useState(2); // Default: desktop
  const [iframeError, setIframeError] = useState(false);
  const currentSize = RESPONSIVE_SIZES[sizeIndex];

  const isDeploying = session?.state === "deploying";
  const hasPreview = !!session?.previewUrl;

  return (
    <div className="flex h-full flex-col bg-surface-container-low">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          Preview
        </span>
        <div className="flex gap-1">
          {RESPONSIVE_SIZES.map((size, i) => (
            <button
              key={size.label}
              onClick={() => setSizeIndex(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                sizeIndex === i
                  ? "bg-primary text-on-primary sanctuary-shadow"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <span className="material-symbols-outlined text-sm">
                {size.icon}
              </span>
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        {/* Decorative sanctuary blurs */}
        <div className="absolute right-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-secondary-container/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[30%] w-[30%] rounded-full bg-primary-container/10 blur-[100px]" />

        <AnimatePresence mode="wait">
          {isDeploying ? (
            <motion.div
              key="deploying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 text-on-surface-variant"
            >
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                progress_activity
              </span>
              <p className="text-sm font-medium">Deploying to preview...</p>
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
                className="h-full w-full rounded-2xl bg-surface-container-lowest sanctuary-shadow"
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
              className="flex w-full max-w-4xl flex-col items-center rounded-[2rem] border-2 border-dashed border-outline-variant/40 bg-surface/30 p-12 backdrop-blur-sm"
              style={{ aspectRatio: "4/3" }}
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-highest">
                <span className="material-symbols-outlined text-4xl text-outline-variant">
                  extension
                </span>
              </div>
              <h3 className="mb-2 font-headline text-xl font-medium text-on-surface-variant">
                Your tool will appear here
              </h3>
              <p className="text-sm text-on-surface-variant/60">
                Start a conversation to build your first therapy tool
              </p>
              {session?.stateMessage && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  {session.stateMessage}
                </p>
              )}
              {/* Skeleton placeholder */}
              <div className="mt-12 w-full max-w-lg space-y-4 opacity-20">
                <div className="mx-auto h-4 w-3/4 rounded-full bg-outline-variant" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 rounded-xl bg-outline-variant" />
                  <div className="h-24 rounded-xl bg-outline-variant" />
                  <div className="h-24 rounded-xl bg-outline-variant" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
