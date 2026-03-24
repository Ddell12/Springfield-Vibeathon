"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ToolRenderer } from "@/features/therapy-tools/components/tool-renderer";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AnimatePresence, motion } from "motion/react";
// NOTE: the "motion" package (v12.x) exports from "motion/react", NOT "framer-motion"

type ToolPreviewProps = {
  toolId: string | null;
};

export function ToolPreview({ toolId }: ToolPreviewProps) {
  // Subscribe to the tool document (reactive)
  const tool = useQuery(
    api.tools.get,
    toolId ? { toolId: toolId as any } : "skip"
    // toolId comes as string from zustand, Convex expects Id<"tools">
  );

  // No tool selected — empty state
  if (!toolId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised">
          <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.01 9.964 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.01-9.964-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-muted">Your tool will appear here</p>
      </div>
    );
  }

  // Loading state — Convex query hasn't resolved yet
  if (tool === undefined) {
    return (
      <div className="flex h-full flex-col gap-4 bg-background p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  // Tool not found (deleted or invalid ID)
  if (tool === null) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-8">
        <p className="text-sm text-muted">Tool not found</p>
      </div>
    );
  }

  // Tool loaded — render with fade-in animation
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tool._id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="h-full overflow-y-auto bg-background"
      >
        <ToolRenderer config={tool.config} />
      </motion.div>
    </AnimatePresence>
  );
}
