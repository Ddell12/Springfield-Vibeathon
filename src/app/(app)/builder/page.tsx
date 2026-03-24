"use client";

import { useState } from "react";

import { BuilderV2Header } from "@/features/builder-v2/components/builder-header";
import { BuilderV2Layout } from "@/features/builder-v2/components/builder-layout";
import { Chat } from "@/features/builder-v2/components/chat";
import { Preview } from "@/features/builder-v2/components/preview";
import type { FragmentResult } from "@/features/builder-v2/lib/schema";

export default function BuilderPage() {
  const [fragment, setFragment] = useState<FragmentResult | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleFragmentGenerated = async (result: FragmentResult) => {
    setFragment(result);
    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment: result }),
      });
      if (res.ok) {
        const { url } = await res.json();
        setSandboxUrl(url);
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleNewProject = () => {
    setFragment(null);
    setSandboxUrl(null);
    setIsPreviewLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <BuilderV2Header
        projectName={fragment?.title}
        onNewProject={handleNewProject}
      />
      <div className="flex-1 overflow-hidden">
        <BuilderV2Layout
          chatPanel={
            <Chat
              onFragmentGenerated={handleFragmentGenerated}
              currentCode={fragment?.code}
            />
          }
          previewPanel={
            <Preview
              fragment={fragment}
              sandboxUrl={sandboxUrl}
              isLoading={isPreviewLoading}
            />
          }
        />
      </div>
    </div>
  );
}
