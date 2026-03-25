"use client";

import { useState } from "react";

import { cn } from "@/core/utils";

interface FileBadge {
  path: string;
  action: "Edited" | "Created";
}

interface FileBadgesProps {
  files: FileBadge[];
}

const COLLAPSED_COUNT = 3;

export function FileBadges({ files }: FileBadgesProps) {
  const [expanded, setExpanded] = useState(false);

  if (files.length === 0) return null;

  const visibleFiles = expanded ? files : files.slice(0, COLLAPSED_COUNT);
  const hasMore = files.length > COLLAPSED_COUNT;

  return (
    <div className="mt-2 space-y-1">
      {visibleFiles.map((file) => {
        const filename = file.path.split("/").pop() ?? file.path;
        return (
          <div
            key={file.path}
            className="flex items-center gap-2 rounded-md py-0.5"
          >
            <span
              className={cn(
                "inline-block h-2 w-2 flex-shrink-0 rounded-full",
                file.action === "Created" ? "bg-primary" : "bg-on-surface-variant"
              )}
            />
            <span className="text-xs text-on-surface-variant">
              {file.action}
            </span>
            <span className="truncate text-xs font-medium text-on-surface">
              {filename}
            </span>
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {expanded ? "Hide" : `Show all (${files.length})`}
        </button>
      )}
    </div>
  );
}
