"use client";

import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "../../../../convex/_generated/api";
import { EXPLORE_DEMO_TOOLS } from "../lib/demo-tools";
import { DemoToolCard } from "./demo-tool-card";
const DemoToolModal = dynamic(
  () => import("./demo-tool-modal").then((m) => ({ default: m.DemoToolModal })),
  { ssr: false }
);

export function DemoToolGrid() {
  const featuredApps = useQuery(api.apps.listFeatured, {});
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const router = useRouter();

  const isLoading = featuredApps === undefined;
  const hasFeatured = featuredApps && featuredApps.length > 0;

  // Build display data — merge Convex data with static metadata by category+title
  const displayTools = hasFeatured
    ? featuredApps.map((app) => {
        const staticTool = EXPLORE_DEMO_TOOLS.find(
          (t) => t.category === app.featuredCategory && t.title === app.title
        );
        return {
          ...app,
          icon: staticTool?.icon ?? "auto_awesome",
          gradient: staticTool?.gradient ?? "from-primary to-primary-container",
          categoryLabel: staticTool?.categoryLabel ?? app.featuredCategory ?? "",
          prompt: staticTool?.prompt ?? "",
          disabled: false,
        };
      })
    : EXPLORE_DEMO_TOOLS.map((tool) => ({
        title: tool.title,
        description: tool.description,
        shareSlug: "",
        featuredCategory: tool.category,
        icon: tool.icon,
        gradient: tool.gradient,
        categoryLabel: tool.categoryLabel,
        prompt: tool.prompt,
        disabled: false,
      }));

  const selectedTool = displayTools.find((t) => t.shareSlug === selectedSlug);

  const handleTryIt = (tool: (typeof displayTools)[number]) => {
    if (tool.shareSlug) {
      setSelectedSlug(tool.shareSlug);
    } else {
      // No live preview — navigate to builder with the prompt pre-filled
      router.push(`/builder?prompt=${encodeURIComponent(tool.prompt)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            className="animate-pulse rounded-2xl bg-surface-container"
          >
            <div className="h-40 bg-surface-container-low rounded-t-2xl" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-surface-container-low rounded w-20" />
              <div className="h-5 bg-surface-container-low rounded w-3/4" />
              <div className="h-4 bg-surface-container-low rounded w-full" />
              <div className="h-10 bg-surface-container-low rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTools.map((tool) => (
          <DemoToolCard
            key={tool.title}
            title={tool.title}
            description={tool.description}
            categoryLabel={tool.categoryLabel}
            icon={tool.icon}
            gradient={tool.gradient}
            disabled={tool.disabled}
            onTryIt={() => handleTryIt(tool)}
          />
        ))}
      </div>

      {selectedTool && (
        <DemoToolModal
          open={!!selectedSlug}
          onClose={() => setSelectedSlug(null)}
          title={selectedTool.title}
          description={selectedTool.description}
          shareSlug={selectedTool.shareSlug}
          prompt={selectedTool.prompt}
        />
      )}
    </>
  );
}
