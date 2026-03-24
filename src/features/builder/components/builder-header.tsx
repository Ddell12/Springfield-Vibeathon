"use client";

import Link from "next/link";
import { MaterialIcon } from "@/shared/components/material-icon";

type BuilderHeaderProps = {
  toolName?: string;
};

export function BuilderHeader({ toolName }: BuilderHeaderProps) {
  return (
    <header className="h-14 bg-surface-container-lowest sanctuary-shadow flex items-center justify-between px-6 z-10">
      {/* Left: Logo + breadcrumb */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-primary font-extrabold text-xl tracking-tighter font-headline"
        >
          Bridges
        </Link>
        {toolName && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/10">
            <span className="text-primary font-bold text-sm">{toolName}</span>
            <MaterialIcon icon="edit" size="sm" className="opacity-60 hover:opacity-100 cursor-pointer" />
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button className="hidden lg:flex items-center gap-2 text-primary font-medium text-sm px-4 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
          <MaterialIcon icon="add" size="sm" />
          New Tool
        </button>
        <button className="flex items-center gap-2 px-4 py-1.5 border-2 border-primary/20 text-primary rounded-lg font-bold text-sm hover:bg-primary/5 transition-colors active:scale-95">
          <MaterialIcon icon="share" size="sm" />
          Share
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden">
          <MaterialIcon icon="account_circle" className="text-primary" />
        </div>
      </div>
    </header>
  );
}
