"use client";

import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BuilderV2Header } from "@/features/builder-v2/components/builder-header";
import { BuilderV2Layout } from "@/features/builder-v2/components/builder-layout";
import { Chat } from "@/features/builder-v2/components/chat";
import type { Message } from "@/features/builder-v2/components/chat";
import { Confetti } from "@/features/builder-v2/components/confetti";
import { PersistenceSheet } from "@/features/builder-v2/components/persistence-sheet";
import { Preview } from "@/features/builder-v2/components/preview";
import { PromptHome } from "@/features/builder-v2/components/prompt-home";
import { PublishDialog } from "@/features/builder-v2/components/publish-dialog";
import { useProjectLoader } from "@/features/builder-v2/hooks/use-project-loader";
import { useTemplateStarter } from "@/features/builder-v2/hooks/use-template-starter";
import type { FragmentResult } from "@/features/builder-v2/lib/schema";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type BuilderMode = "prompt" | "building";
type PublishStatus = "idle" | "building" | "done" | "error";

function BuilderContent() {
  // Core state
  const [fragment, setFragment] = useState<FragmentResult | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [projectId, setProjectId] = useState<Id<"projects"> | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [currentSandboxId, setCurrentSandboxId] = useState<string | null>(null);

  // New: persistence, iteration, publish, responsive, confetti, new-confirm
  const [persistence, setPersistence] = useState<"session" | "device" | "cloud">("device");
  const [showPersistenceSheet, setShowPersistenceSheet] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isIterating, setIsIterating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [breakpoint, setBreakpoint] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishError, setPublishError] = useState<string | undefined>(undefined);
  const [showNewConfirm, setShowNewConfirm] = useState(false);

  const isFirstGeneration = useRef(true);

  // Convex mutations/queries
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const saveVersion = useMutation(api.projects.saveVersion);
  const updatePublishUrl = useMutation(api.projects.updatePublishUrl);

  const projectData = useQuery(
    api.projects.get,
    projectId ? { projectId } : "skip"
  );

  const latestVersion = useQuery(
    api.projects.getLatestVersion,
    projectId ? { projectId } : "skip"
  );

  const { starterPrompt } = useTemplateStarter();

  const hasRestoredProject = useRef(false);
  const { loadedProject, isLoadingProject } = useProjectLoader();

  const getInitialMode = (): BuilderMode => {
    if (starterPrompt) return "building";
    return "prompt";
  };

  const [mode, setMode] = useState<BuilderMode>(getInitialMode);

  // Restore project from ?project= URL param
  useEffect(() => {
    if (!loadedProject || hasRestoredProject.current) return;
    if (!loadedProject.fragment) return;

    hasRestoredProject.current = true;
    const restoredFragment = loadedProject.fragment as FragmentResult;
    setFragment(restoredFragment);
    setProjectId(loadedProject._id);
    setIsPreviewLoading(true);
    setMode("building");
    if (loadedProject.persistence) {
      setPersistence(loadedProject.persistence as "session" | "device" | "cloud");
    }

    fetch("/api/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragment: restoredFragment }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ url, sandboxId }: { url: string; sandboxId: string }) => {
        setSandboxUrl(url);
        setCurrentSandboxId(sandboxId);
      })
      .catch(() => {})
      .finally(() => setIsPreviewLoading(false));
  }, [loadedProject]);

  // Persistence sheet intercepts first prompt
  const handlePromptSubmit = (message: string) => {
    setPendingMessage(message);
    setShowPersistenceSheet(true);
  };

  const handlePersistenceSelect = async (tier: "session" | "device" | "cloud") => {
    setPersistence(tier);
    setShowPersistenceSheet(false);
    if (pendingMessage) {
      setInitialMessage(pendingMessage);
      setPendingMessage(null);
      setMode("building");
    }
  };

  const handleFragmentGenerated = async (result: FragmentResult) => {
    const isIteration = !!fragment;

    // Save version BEFORE updating (for undo)
    if (isIteration && fragment && projectId) {
      await saveVersion({
        projectId,
        fragment,
        sandboxId: currentSandboxId ?? "",
      });
    }

    setFragment(result);

    // Iteration: keep preview visible with overlay; first build: show loading
    if (isIteration) {
      setIsIterating(true);
    } else {
      setIsPreviewLoading(true);
    }

    try {
      let currentProjectId = projectId;
      if (!currentProjectId) {
        currentProjectId = await createProject({
          title: result.title,
          description: result.description,
        });
        setProjectId(currentProjectId);
        // Save persistence on initial creation
        await updateProject({
          projectId: currentProjectId,
          persistence,
        });
      }

      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment: result, sandboxId: currentSandboxId }),
      });
      if (res.ok) {
        const { url, sandboxId }: { url: string; sandboxId: string } = await res.json();
        if (url !== sandboxUrl) setSandboxUrl(url);
        setCurrentSandboxId(sandboxId);
        await updateProject({
          projectId: currentProjectId,
          title: result.title,
          description: result.description,
          fragment: result,
          sandboxId,
        });
      }

      // Confetti on first generation
      if (isFirstGeneration.current) {
        setShowConfetti(true);
        isFirstGeneration.current = false;
      }
    } finally {
      setIsPreviewLoading(false);
      setIsIterating(false);
    }
  };

  // Undo: restore previous version
  const handleUndo = async () => {
    if (!latestVersion || !projectId) return;
    const prevFragment = latestVersion.fragment as FragmentResult;
    setFragment(prevFragment);
    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment: prevFragment, sandboxId: currentSandboxId }),
      });
      if (res.ok) {
        const { url, sandboxId }: { url: string; sandboxId: string } = await res.json();
        if (url !== sandboxUrl) setSandboxUrl(url);
        setCurrentSandboxId(sandboxId);
        await updateProject({
          projectId,
          fragment: prevFragment,
          title: prevFragment.title,
        });
        toast("Restored previous version");
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Message persistence
  const handleMessagesChange = async (msgs: Message[]) => {
    if (!projectId) return;
    await updateProject({ projectId, messages: msgs });
  };

  const restoredMessages = loadedProject?.messages as Message[] | undefined;
  const hasRestoredMessages = restoredMessages && restoredMessages.length > 0;

  // Publish flow
  const handlePublish = async () => {
    if (!fragment || !projectId) return;
    setPublishStatus("building");
    setPublishError(undefined);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fragment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPublishError(data.error ?? "Publish failed");
        setPublishStatus("error");
        return;
      }
      const { url } = await res.json();
      await updatePublishUrl({ projectId, publishedUrl: url });
      setPublishStatus("done");
      setShowConfetti(true);
    } catch {
      setPublishError("Publish failed — please try again.");
      setPublishStatus("error");
    }
  };

  // New project with confirmation
  const handleNewProject = () => {
    if (fragment) {
      setShowNewConfirm(true);
    } else {
      resetProject();
    }
  };

  const resetProject = () => {
    setFragment(null);
    setSandboxUrl(null);
    setIsPreviewLoading(false);
    setProjectId(null);
    setShowShareDialog(false);
    setInitialMessage(undefined);
    setCurrentSandboxId(null);
    setShowNewConfirm(false);
    setShowPublishDialog(false);
    setPublishStatus("idle");
    setPublishError(undefined);
    setIsIterating(false);
    isFirstGeneration.current = true;
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
    toast("Tool saved to your files!");
  };

  // Breakpoint → pixel width for preview
  const breakpointWidth = breakpoint === "mobile" ? 375 : breakpoint === "tablet" ? 768 : undefined;

  return (
    <div className="flex flex-col h-full">
      <Confetti trigger={showConfetti} />

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
              onUndo={handleUndo}
              canUndo={!!latestVersion}
              hasProject={!!projectId}
              onPublish={() => {
                setPublishStatus("idle");
                setShowPublishDialog(true);
              }}
              responsiveValue={breakpoint}
              onResponsiveChange={setBreakpoint}
            />
            <div className="flex-1 overflow-hidden">
              <BuilderV2Layout
                chatPanel={
                  <Chat
                    onFragmentGenerated={handleFragmentGenerated}
                    currentCode={fragment?.code}
                    initialMessage={hasRestoredMessages ? undefined : (initialMessage ?? starterPrompt)}
                    onMessagesChange={handleMessagesChange}
                    initialMessages={restoredMessages}
                  />
                }
                previewPanel={
                  <Preview
                    fragment={fragment}
                    sandboxUrl={sandboxUrl}
                    isLoading={isPreviewLoading || isLoadingProject}
                    isIterating={isIterating}
                    breakpointWidth={breakpointWidth}
                  />
                }
              />
            </div>

            {/* Share dialog */}
            {showShareDialog && projectData && (
              <ShareDialog
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                shareSlug={projectData.shareSlug}
                toolTitle={projectData.title}
                publishedUrl={projectData.publishedUrl}
              />
            )}

            {/* Publish dialog */}
            <PublishDialog
              open={showPublishDialog}
              onOpenChange={setShowPublishDialog}
              onPublish={handlePublish}
              projectTitle={fragment?.title ?? "Untitled"}
              status={publishStatus}
              publishedUrl={projectData?.publishedUrl}
              errorMessage={publishError}
            />

            {/* New project confirmation */}
            <AlertDialog open={showNewConfirm} onOpenChange={setShowNewConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start a new tool?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your current tool is saved. You can find it in My Tools anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetProject}>Start New</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistence sheet — shown before first build */}
      <PersistenceSheet
        open={showPersistenceSheet}
        onOpenChange={setShowPersistenceSheet}
        onSelect={handlePersistenceSelect}
        defaultValue={persistence}
      />
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
