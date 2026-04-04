"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { MaterialIcon } from "@/shared/components/material-icon";
import { ToolRuntimePage } from "@/features/tools/components/runtime/tool-runtime-page";

import { api } from "../../../../convex/_generated/api";

export function SharedToolPage() {
  const params = useParams();
  const shareToken = typeof params?.toolId === "string" ? params.toolId : "";
  const result = useQuery(
    api.tools.getByShareToken,
    shareToken ? { shareToken } : "skip"
  );

  if (result === undefined) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col items-center justify-center">
        <div data-testid="loading-skeleton" className="animate-pulse space-y-4 max-w-4xl w-full px-8">
          <div className="h-10 bg-surface-container-low rounded-xl w-64" />
          <div className="h-[60vh] bg-surface-container-low rounded-xl" />
        </div>
      </div>
    );
  }

  if (result === null) {
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

  const { instance, configJson } = result;

  return (
    <div className="min-h-screen flex flex-col">
      <ToolRuntimePage
        shareToken={shareToken}
        templateType={instance.templateType}
        configJson={configJson}
      />

      <footer className="fixed bottom-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface-variant">
            Build your own — powered by{" "}
            <span className="text-primary-container font-bold">Vocali</span>
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
