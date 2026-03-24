"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ToolRenderer } from "@/features/therapy-tools/components/tool-renderer";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MaterialIcon } from "@/shared/components/material-icon";
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

  // No tool selected — empty state with decorative elements
  if (!toolId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-surface p-8 text-center relative overflow-hidden">
        {/* Decorative blurred background orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-secondary-container/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="border-2 border-dashed border-outline-variant/30 rounded-[2rem] p-12 flex flex-col items-center gap-4">
            <MaterialIcon icon="extension" size="xl" className="text-on-surface-variant/40" />
            <p className="text-sm text-on-surface-variant">Your tool will appear here</p>
          </div>

          {/* Skeleton preview cards */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-sm opacity-30">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Loading state — Convex query hasn't resolved yet
  if (tool === undefined) {
    return (
      <div className="flex h-full flex-col gap-4 bg-surface p-8">
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
      <div className="flex h-full items-center justify-center bg-surface p-8">
        <p className="text-sm text-on-surface-variant">Tool not found</p>
      </div>
    );
  }

  // Tool loaded — render with fade-in animation in Safe Space Container
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tool._id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="h-full overflow-y-auto bg-surface"
      >
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 sanctuary-shadow safe-space-container m-4">
          <ToolRenderer config={tool.config} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
