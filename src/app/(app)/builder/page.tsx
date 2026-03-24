"use client";

import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, useEffect, useRef, useState } from "react";

import { BuilderV2Header } from "@/features/builder-v2/components/builder-header";
import { BuilderV2Layout } from "@/features/builder-v2/components/builder-layout";
import { Chat } from "@/features/builder-v2/components/chat";
import { Preview } from "@/features/builder-v2/components/preview";
import { PromptHome } from "@/features/builder-v2/components/prompt-home";
import { useProjectLoader } from "@/features/builder-v2/hooks/use-project-loader";
import { useTemplateStarter } from "@/features/builder-v2/hooks/use-template-starter";
import type { FragmentResult } from "@/features/builder-v2/lib/schema";
import { ShareDialog } from "@/features/sharing/components/share-dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type BuilderMode = "prompt" | "building";

function BuilderContent() {
  const [fragment, setFragment] = useState<FragmentResult | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [projectId, setProjectId] = useState<Id<"projects"> | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [currentSandboxId, setCurrentSandboxId] = useState<string | null>(null);

  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const projectData = useQuery(
    api.projects.get,
    projectId ? { projectId } : "skip"
  );

  const { starterPrompt } = useTemplateStarter();

  const hasRestoredProject = useRef(false);
  const { loadedProject, isLoadingProject } = useProjectLoader();

  // Determine initial mode: skip prompt when starterPrompt or loadedProject is present
  const getInitialMode = (): BuilderMode => {
    if (starterPrompt) return "building";
    return "prompt";
  };

  const [mode, setMode] = useState<BuilderMode>(getInitialMode);

  // Restore project from ?project= URL param — also skip prompt mode
  useEffect(() => {
    if (!loadedProject || hasRestoredProject.current) return;
    if (!loadedProject.fragment) return;

    hasRestoredProject.current = true;
    const restoredFragment = loadedProject.fragment as FragmentResult;
    setFragment(restoredFragment);
    setProjectId(loadedProject._id);
    setIsPreviewLoading(true);
    setMode("building");

    fetch("/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: restoredFragment }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ url, sandboxId }) => {
        setSandboxUrl(url);
        setCurrentSandboxId(sandboxId);
      })
      .catch(() => {})
      .finally(() => setIsPreviewLoading(false));
  }, [loadedProject]);

  const handlePromptSubmit = (message: string) => {
    setInitialMessage(message);
    setMode("building");
  };

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
        body: JSON.stringify({ fragment: result, sandboxId: currentSandboxId }),
      });
      if (res.ok) {
        const { url, sandboxId } = await res.json();
        setSandboxUrl(url);
        setCurrentSandboxId(sandboxId);
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
    setInitialMessage(undefined);
    setCurrentSandboxId(null);
    hasRestoredProject.current = false;
    setMode("prompt");
  };

  const handleDownload = () => {
    if (!fragment?.code) return;
    const blob = new Blob([fragment.code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fragment.title.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {mode === "prompt" ? (
          <motion.div
            key="prompt"
            className="flex-1 overflow-auto"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <PromptHome onSubmit={handlePromptSubmit} />
          </motion.div>
        ) : (
          <motion.div
            key="building"
            className="flex flex-col h-full"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <BuilderV2Header
              projectName={fragment?.title}
              onNewProject={handleNewProject}
              onShare={() => setShowShareDialog(true)}
              onDownload={handleDownload}
              hasProject={!!projectId}
            />
            <div className="flex-1 overflow-hidden">
              <BuilderV2Layout
                chatPanel={
                  <Chat
                    onFragmentGenerated={handleFragmentGenerated}
                    currentCode={fragment?.code}
                    initialMessage={initialMessage ?? starterPrompt}
                  />
                }
                previewPanel={
                  <Preview
                    fragment={fragment}
                    sandboxUrl={sandboxUrl}
                    isLoading={isPreviewLoading || isLoadingProject}
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
          </motion.div>
        )}
      </AnimatePresence>
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
