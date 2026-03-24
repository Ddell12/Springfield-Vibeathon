"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { FragmentResult } from "../lib/schema";
import { FragmentWeb } from "./fragment-web";
import { LoadingCarousel } from "./loading-carousel";

type PreviewProps = {
  fragment: FragmentResult | null;
  sandboxUrl: string | null;
  isLoading: boolean;
};

export function Preview({ fragment, sandboxUrl, isLoading }: PreviewProps) {
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!fragment?.code) return;
    navigator.clipboard.writeText(fragment.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-low">
      {/* Header bar */}
      <div className="h-10 flex items-center justify-between px-4 bg-surface-container-lowest shrink-0">
        <span className={cn("text-sm truncate", fragment ? "font-semibold text-on-surface" : "text-on-surface-variant")}>
          {fragment ? fragment.title : "Preview"}
        </span>

        {fragment && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                viewMode === "preview"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
              type="button"
            >
              <MaterialIcon icon="preview" size="sm" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                viewMode === "code"
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
              type="button"
            >
              <MaterialIcon icon="code" size="sm" />
              Code
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden bg-surface-container-lowest">
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
          ) : fragment && viewMode === "code" ? (
            <motion.div
              key="code"
              className="absolute inset-0 bg-surface-container overflow-auto p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant text-xs font-medium hover:text-primary transition-colors"
                  type="button"
                >
                  <MaterialIcon icon={copied ? "check" : "content_copy"} size="sm" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-xs text-on-surface font-mono leading-relaxed whitespace-pre-wrap break-words">
                {fragment.code}
              </pre>
            </motion.div>
          ) : fragment && sandboxUrl ? (
            <motion.div
              key="preview"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <FragmentWeb url={sandboxUrl} title={fragment.title} />
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
              <p className="text-sm font-medium">Your app preview will appear here</p>
              <p className="text-xs opacity-70">Describe a therapy tool in the chat to get started</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
