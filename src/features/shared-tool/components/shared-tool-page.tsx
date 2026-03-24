"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";

export function SharedToolPage() {
  const params = useParams();
  const slug = params?.toolId as string;
  const project = useQuery(api.projects.getBySlug, slug ? { slug } : "skip");
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!project?._id || !project?.fragment) return;
    let cancelled = false;

    async function bootSandbox() {
      setIsBooting(true);
      setSandboxError(null);
      try {
        const res = await fetch("/api/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fragment: project!.fragment }),
        });
        if (!res.ok) throw new Error("Failed to start sandbox");
        const { url } = await res.json();
        if (!cancelled) setSandboxUrl(url);
      } catch {
        if (!cancelled) setSandboxError("Unable to load this tool right now. Please try again later.");
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }

    bootSandbox();
    return () => { cancelled = true; };
  }, [project?._id, retryCount]);

  if (project === undefined) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center">
        <div data-testid="loading-skeleton" className="animate-pulse space-y-4 max-w-4xl w-full px-8">
          <div className="h-10 bg-surface-container-low rounded-xl w-64" />
          <div className="h-[60vh] bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
        <MaterialIcon icon="search_off" className="text-6xl text-primary/40" />
        <h1 className="font-headline font-bold text-3xl text-on-surface">
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

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <header className="flex justify-center items-center w-full px-6 py-4 bg-surface">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <Link href="/" className="text-primary-container font-extrabold tracking-tight font-headline text-lg">
            Bridges
          </Link>
          <span className="hidden md:block text-on-surface-variant font-label text-sm">
            {project.title}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6">
        {isBooting ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full max-w-5xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary" />
            <p className="text-on-surface-variant font-medium">Loading your therapy tool...</p>
            <p className="text-on-surface-variant/60 text-sm">This usually takes 10-15 seconds</p>
          </div>
        ) : sandboxError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <MaterialIcon icon="error_outline" className="text-5xl text-error/60" />
            <p className="text-on-surface-variant">{sandboxError}</p>
            <button
              onClick={() => { setSandboxError(null); setRetryCount(c => c + 1); }}
              className="text-primary font-semibold hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : sandboxUrl ? (
          <div className="w-full max-w-5xl flex-1">
            <iframe
              src={sandboxUrl}
              title={project.title}
              className="w-full h-[70vh] rounded-xl border border-outline-variant/20 shadow-lg"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : null}
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
