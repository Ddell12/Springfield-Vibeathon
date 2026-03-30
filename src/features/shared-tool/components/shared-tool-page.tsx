"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";

export function SharedToolPage() {
  const params = useParams();
  const slug = typeof params?.toolId === "string" ? params.toolId : "";
  const app = useQuery(api.apps.getByShareSlug, slug ? { shareSlug: slug } : "skip");

  if (app === undefined) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center">
        <div data-testid="loading-skeleton" className="animate-pulse space-y-4 max-w-4xl w-full px-8">
          <div className="h-10 bg-surface-container-low rounded-xl w-64" />
          <div className="h-[60vh] bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  if (app === null) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
        <MaterialIcon icon="search_off" className="text-6xl text-primary/40" />
        <h1 className="font-headline font-normal text-3xl text-on-surface">
          This tool doesn&apos;t exist
        </h1>
        <p className="text-on-surface-variant text-lg">
          It may have been removed, or the link might be incorrect.
        </p>
        <Link
          href="/builder"
          className="bg-primary-gradient text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95"
        >
          Build Your Own
        </Link>
      </div>
    );
  }

  const bundleUrl = app.sessionId ? `/api/tool/${slug}` : null;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <header className="flex justify-center items-center w-full px-6 py-4 bg-surface">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <Link href="/" className="text-primary-container font-medium tracking-tight text-lg">
            Bridges
          </Link>
          <span className="hidden md:block text-on-surface-variant font-label text-sm">
            {app.title}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6">
        {bundleUrl ? (
          <div className="w-full max-w-5xl flex-1">
            <iframe
              src={bundleUrl}
              title={app.title}
              className="w-full h-[70vh] rounded-xl border border-outline-variant/20 shadow-lg"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <MaterialIcon icon="construction" className="text-5xl text-primary/60" />
            <p className="text-on-surface-variant text-lg">This tool is still being built.</p>
            <p className="text-on-surface-variant text-sm">Check back soon!</p>
          </div>
        )}
      </main>

      <div className="h-24" />

      <footer className="fixed bottom-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10">
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
