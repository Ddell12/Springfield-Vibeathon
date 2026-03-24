"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MaterialIcon } from "@/shared/components/material-icon";
import { ToolRenderer } from "@/features/therapy-tools/components/tool-renderer";
import type { ToolConfig } from "@/features/therapy-tools/types/tool-configs";

export function SharedToolPage() {
  const params = useParams();
  const slug = params?.toolId as string;
  const tool = useQuery(api.tools.getBySlug, slug ? { slug } : "skip");

  // Loading state
  if (tool === undefined) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center">
        <div data-testid="loading-skeleton" className="animate-pulse space-y-4 max-w-4xl w-full px-8">
          <div className="h-10 bg-surface-container-low rounded-xl w-64" />
          <div className="h-64 bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  // Not found state
  if (tool === null) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
        <MaterialIcon icon="search_off" className="text-6xl text-primary/40" />
        <h1 className="font-headline font-bold text-3xl text-on-surface">
          Build your own therapy tools with Bridges
        </h1>
        <p className="text-on-surface-variant text-lg">
          This tool doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/builder"
          className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95"
        >
          Create Tool
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="flex justify-center items-center w-full px-6 py-4 bg-surface">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <Link href="/" className="text-primary-container font-extrabold tracking-tight font-headline text-lg">
            Bridges
          </Link>
          <span className="hidden md:block text-on-surface-variant font-label text-sm">
            Public Tool View
          </span>
          <div className="flex items-center gap-3">
            <button className="hover:bg-surface-container-low p-2 rounded-full transition-colors">
              <MaterialIcon icon="share" className="text-on-surface-variant" />
            </button>
            <button className="hover:bg-surface-container-low p-2 rounded-full transition-colors">
              <MaterialIcon icon="info" className="text-on-surface-variant" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow flex items-start justify-center px-4 py-12 md:py-20">
        <div className="max-w-4xl w-full">
          {/* Tool Header */}
          <div className="mb-10 ml-2 md:ml-8">
            <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-primary tracking-tight mb-2">
              {tool.title}
            </h1>
            <p className="font-body text-on-surface-variant text-base max-w-lg">
              {tool.description}
            </p>
          </div>

          {/* Safe Space Container */}
          <div className="safe-space-container bg-surface-container-lowest p-6 md:p-10 sanctuary-shadow relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-secondary-container/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-primary-container/5 blur-3xl" />

            <div className="relative z-10">
              <ToolRenderer config={tool.config as ToolConfig} />
            </div>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Therapist Tip */}
            <div className="bg-tertiary-fixed rounded-xl p-6 flex gap-4 items-start">
              <MaterialIcon icon="lightbulb" filled className="text-on-tertiary-fixed-variant" />
              <div>
                <h4 className="font-headline font-bold text-on-tertiary-fixed mb-1">
                  Therapist&apos;s Tip
                </h4>
                <p className="font-body text-sm text-on-tertiary-fixed-variant">
                  Try to name the physical sensation you feel in your body along with
                  the emoji you choose.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Spacer for sticky footer */}
      <div className="h-24" />

      {/* Bottom Sticky Footer */}
      <footer className="fixed bottom-0 inset-x-0 z-50 glass-effect border-t border-outline-variant/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface-variant">
            Build your own — powered by{" "}
            <span className="text-primary-container font-bold">Bridges</span>
          </span>
          <Link
            href="/builder"
            className="bg-primary-gradient px-5 py-2 rounded-lg text-white font-label font-semibold text-sm hover:opacity-90 transition-all active:scale-95"
          >
            Create Tool
          </Link>
        </div>
      </footer>
    </div>
  );
}
