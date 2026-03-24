"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";

type BuilderV2HeaderProps = {
  projectName?: string;
  shareSlug?: string;
  onNewProject?: () => void;
};

export function BuilderV2Header({ projectName, shareSlug: _shareSlug, onNewProject }: BuilderV2HeaderProps) {
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
        <button
          className="flex items-center gap-2 text-primary font-medium text-sm px-4 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors min-h-[44px]"
          onClick={onNewProject}
          type="button"
        >
          <MaterialIcon icon="add" size="sm" />
          New Project
        </button>
        <button
          className="flex items-center gap-2 px-4 py-1.5 text-primary rounded-lg font-bold text-sm hover:bg-primary/5 transition-colors active:scale-95 min-h-[44px]"
          type="button"
        >
          <MaterialIcon icon="share" size="sm" />
          Share
        </button>
      </div>
    </header>
  );
}
