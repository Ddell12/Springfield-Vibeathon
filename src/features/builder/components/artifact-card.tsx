"use client";

import { MaterialIcon } from "@/shared/components/material-icon";

interface ArtifactCardProps {
  title: string;
  isGenerating: boolean;
}

export function ArtifactCard({ title, isGenerating }: ArtifactCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant">Therapy app</p>
        </div>
        <MaterialIcon
          icon="disabled_by_default"
          size="sm"
          className="text-on-surface-variant/50"
        />
      </div>
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
