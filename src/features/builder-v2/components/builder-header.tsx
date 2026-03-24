"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

type BuilderV2HeaderProps = {
  projectName?: string;
  shareSlug?: string;
  onNewProject?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onUndo?: () => void;
  onPublish?: () => void;
  canUndo?: boolean;
  hasProject?: boolean;
  responsiveValue?: "mobile" | "tablet" | "desktop";
  onResponsiveChange?: (value: "mobile" | "tablet" | "desktop") => void;
};

export function BuilderV2Header({
  projectName,
  onNewProject,
  onShare,
  onDownload,
  onUndo,
  onPublish,
  canUndo,
  hasProject,
}: BuilderV2HeaderProps) {
  return (
    <header className="h-14 bg-surface-container-lowest flex items-center justify-between px-6 z-10 shrink-0">
      {/* Left: Logo + project breadcrumb */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-primary font-extrabold text-xl tracking-tighter font-headline"
        >
          Bridges
        </Link>
        {projectName && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full">
            <span className="text-primary font-bold text-sm">{projectName}</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {canUndo && (
          <button
            className="flex items-center gap-2 w-9 h-9 justify-center text-on-surface-variant rounded-full hover:bg-surface-container-high hover:text-primary transition-colors"
            type="button"
            onClick={onUndo}
            title="Undo"
          >
            <MaterialIcon icon="undo" size="sm" />
          </button>
        )}
        {hasProject && onDownload && (
          <span title="Save to my files">
            <button
              className="flex items-center gap-2 w-9 h-9 justify-center text-on-surface-variant rounded-full hover:bg-surface-container-high hover:text-primary transition-colors border border-surface-container"
              type="button"
              onClick={onDownload}
              title="Download Code"
            >
              <MaterialIcon icon="download" size="sm" />
            </button>
          </span>
        )}
        <button
          className="flex items-center gap-2 px-4 py-1.5 text-on-surface-variant rounded-full border border-surface-container hover:bg-surface-container-high hover:text-primary transition-colors min-h-[36px]"
          type="button"
          onClick={onNewProject}
        >
          <MaterialIcon icon="add" size="sm" />
          <span className="text-sm font-medium">New</span>
        </button>
        {hasProject && (
          <button
            className="flex items-center gap-2 px-4 py-1.5 text-primary rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors active:scale-95 min-h-[36px]"
            type="button"
            onClick={onShare}
          >
            <MaterialIcon icon="share" size="sm" />
            <span className="text-sm font-bold">Share</span>
          </button>
        )}
        {onPublish && (
          <button
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm active:scale-95 min-h-[36px]"
            type="button"
            onClick={onPublish}
          >
            <span className="text-sm font-bold">Publish</span>
          </button>
        )}
      </div>
    </header>
  );
}
