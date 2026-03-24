"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { FragmentResult } from "../lib/schema";
import { FragmentWeb } from "./fragment-web";
import { LoadingCarousel } from "./loading-carousel";

type PreviewProps = {
  fragment: FragmentResult | null;
  sandboxUrl: string | null;
  isLoading: boolean;
  isIterating?: boolean;
  breakpointWidth?: number;
};

export function Preview({ fragment, sandboxUrl, isLoading, isIterating, breakpointWidth }: PreviewProps) {
  return (
    <div className="flex flex-col h-full bg-surface-container-low">
      {/* Header bar */}
      <div className="h-10 flex items-center justify-between px-4 bg-surface-container-lowest shrink-0">
        <span className={cn("text-sm truncate", fragment ? "font-semibold text-on-surface" : "text-on-surface-variant")}>
          {fragment ? fragment.title : "Preview"}
        </span>
        {fragment && (
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Preview"
          >
            <MaterialIcon icon="preview" size="sm" />
            Preview
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden bg-surface-container-lowest">
        {isIterating && (
          <div className="absolute inset-x-0 top-2 flex justify-center z-20 pointer-events-none">
            <span className="bg-surface-container text-on-surface-variant text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
              Updating your tool...
            </span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              className="absolute inset-0 z-10"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <LoadingCarousel />
            </motion.div>
          ) : fragment && sandboxUrl ? (
            <motion.div
              key="preview"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <FragmentWeb url={sandboxUrl} title={fragment.title} width={breakpointWidth} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-on-surface-variant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="text-4xl">&#9654;</span>
              <p className="text-sm font-medium">Your tool preview</p>
              <p className="text-xs opacity-70">Describe a therapy tool in the chat to get started</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
