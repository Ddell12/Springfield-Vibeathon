"use client";

import { useMutation, useQuery } from "convex/react";
import { Suspense, useState } from "react";

import { BuilderV2Header } from "@/features/builder-v2/components/builder-header";
import { BuilderV2Layout } from "@/features/builder-v2/components/builder-layout";
import { Chat } from "@/features/builder-v2/components/chat";
import { Preview } from "@/features/builder-v2/components/preview";
import { useTemplateStarter } from "@/features/builder-v2/hooks/use-template-starter";
import type { FragmentResult } from "@/features/builder-v2/lib/schema";
import { ShareDialog } from "@/features/sharing/components/share-dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function BuilderContent() {
  const [fragment, setFragment] = useState<FragmentResult | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [projectId, setProjectId] = useState<Id<"projects"> | null>(null);

  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const projectData = useQuery(
    api.projects.get,
    projectId ? { projectId } : "skip"
  );

  const { starterPrompt } = useTemplateStarter();

  const handleFragmentGenerated = async (result: FragmentResult) => {
    setFragment(result);
    setIsPreviewLoading(true);
    try {
      let currentProjectId = projectId;
      if (!currentProjectId) {
        currentProjectId = await createProject({
          title: result.title,
          description: result.description,
        });
        setProjectId(currentProjectId);
      }

      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment: result }),
      });
      if (res.ok) {
        const { url, sandboxId } = await res.json();
        setSandboxUrl(url);
        await updateProject({
          projectId: currentProjectId,
          title: result.title,
          description: result.description,
          fragment: result,
          sandboxId,
        });
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleNewProject = () => {
    setFragment(null);
    setSandboxUrl(null);
    setIsPreviewLoading(false);
    setProjectId(null);
    setShowShareDialog(false);
  };

  return (
    <div className="flex flex-col h-full">
      <BuilderV2Header
        projectName={fragment?.title}
        onNewProject={handleNewProject}
        onShare={() => setShowShareDialog(true)}
        hasProject={!!projectId}
      />
      <div className="flex-1 overflow-hidden">
        <BuilderV2Layout
          chatPanel={
            <Chat
              onFragmentGenerated={handleFragmentGenerated}
              currentCode={fragment?.code}
              initialMessage={starterPrompt}
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
      {showShareDialog && projectData && (
        <ShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          shareSlug={projectData.shareSlug}
          toolTitle={projectData.title}
        />
      )}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-on-surface-variant">Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}
