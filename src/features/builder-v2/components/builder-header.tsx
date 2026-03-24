"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

type BuilderV2HeaderProps = {
  projectName?: string;
  shareSlug?: string;
  onNewProject?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  hasProject?: boolean;
};

export function BuilderV2Header({ projectName, onNewProject, onShare, onDownload, hasProject }: BuilderV2HeaderProps) {
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

      {/* Center: View Toggles */}
      <div className="hidden md:flex items-center bg-surface-container-low rounded-lg p-1 border border-surface-container-high/50">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-primary font-semibold text-sm bg-surface-container-lowest shadow-sm">
          <MaterialIcon icon="preview" size="sm" />
          Preview
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="cloud" size="sm" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="code" size="sm" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="analytics" size="sm" />
        </button>
        <div className="w-[1px] h-4 bg-surface-container-high mx-2" />
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-md text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors">
          <MaterialIcon icon="add" size="sm" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {hasProject && onDownload && (
          <button
            className="flex items-center gap-2 w-9 h-9 justify-center text-on-surface-variant rounded-full hover:bg-surface-container-high hover:text-primary transition-colors border border-surface-container"
            type="button"
            onClick={onDownload}
            title="Download Code"
          >
            <MaterialIcon icon="download" size="sm" />
          </button>
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
        <button
          className="flex items-center gap-2 px-4 py-1.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm active:scale-95 min-h-[36px]"
          type="button"
        >
          <span className="text-sm font-bold">Publish</span>
        </button>
      </div>
    </header>
  );
}
