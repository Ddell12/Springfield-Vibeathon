"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

interface ArtifactCardProps {
  title: string;
  isGenerating: boolean;
  onClick?: () => void;
}

export function ArtifactCard({ title, isGenerating, onClick }: ArtifactCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 text-left transition-colors",
          onClick ? "cursor-pointer hover:bg-surface-container active:scale-[0.99]" : "cursor-default",
        )}
      >
        <div>
          <p className="text-sm font-medium text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant">Therapy app</p>
        </div>
        {onClick && (
          <MaterialIcon
            icon="open_in_new"
            size="sm"
            className="text-on-surface-variant/50"
          />
        )}
      </button>
      {isGenerating && (
        <div
          role="status"
          aria-label="Building your app"
          className="ml-1 h-6 w-6 animate-spin rounded-full border-2 border-dashed border-primary/40"
        />
      )}
    </div>
  );
}
