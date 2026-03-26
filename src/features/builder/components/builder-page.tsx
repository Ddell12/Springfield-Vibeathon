"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useStreaming } from "../hooks/use-streaming";
import { useWebContainer } from "../hooks/use-webcontainer";
import { BuilderToolbar, type DeviceSize, type ViewMode } from "./builder-toolbar";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";
import { PublishSuccessModal } from "./publish-success-modal";
import { SuggestionChips } from "./suggestion-chips";

export function BuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromUrl = searchParams.get("sessionId");

  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const publishApp = useAction(api.publish.publishApp);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const [isEditingName, setIsEditingName] = useState(false);
  const [promptInput, setPromptInput] = useState("");

  const { status: wcStatus, previewUrl, writeFile, error: wcError } = useWebContainer();

  const {
    status,
    files,
    generate,
    resumeSession,
    blueprint,
    error,
    sessionId,
    streamingText,
    activities,
  } = useStreaming({
    onFileComplete: writeFile,
  });

  // Session resume: fetch session + files when ?sessionId is in URL
  const resumeSessionData = useQuery(
    api.sessions.get,
    sessionIdFromUrl ? { sessionId: sessionIdFromUrl as Id<"sessions"> } : "skip"
  );
  const resumeFiles = useQuery(
    api.generated_files.list,
    sessionIdFromUrl ? { sessionId: sessionIdFromUrl as Id<"sessions"> } : "skip"
  );

  // Resume an existing session when navigating from My Apps
  const sessionResumed = useRef(false);
  useEffect(() => {
    if (
      sessionIdFromUrl &&
      resumeSessionData &&
      resumeFiles &&
      wcStatus === "ready" &&
      status === "idle" &&
      !sessionResumed.current
    ) {
      sessionResumed.current = true;

      // Write all files to WebContainer
      for (const file of resumeFiles) {
        writeFile(file.path, file.contents).catch((err: unknown) => {
          console.error(`[resume] Failed to write ${file.path}:`, err);
        });
      }

      // Restore streaming hook state
      resumeSession({
        sessionId: sessionIdFromUrl,
        files: resumeFiles.map((f) => ({ path: f.path, contents: f.contents })),
        blueprint: resumeSessionData.blueprint ?? null,
      });
    }
  }, [sessionIdFromUrl, resumeSessionData, resumeFiles, wcStatus, status, writeFile, resumeSession]);

  // Auto-submit prompt from URL query param (e.g., from template chips)
  const promptSubmitted = useRef(false);
  const lastPromptRef = useRef<string>("");

  const handleGenerate = (prompt: string) => {
    lastPromptRef.current = prompt;
    generate(prompt);
  };

  const handleRetry = () => {
    if (lastPromptRef.current) {
      generate(lastPromptRef.current);
    }
  };

  const handleNameEditEnd = async (name: string) => {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === appName || !sessionId) return;
    try {
      await updateTitle({ sessionId: sessionId as Id<"sessions">, title: trimmed });
    } catch {
      toast.error("Failed to rename app");
    }
  };

  const promptFromUrl = searchParams.get("prompt");

  useEffect(() => {
    if (promptFromUrl && status === "idle" && !promptSubmitted.current) {
      promptSubmitted.current = true;
      handleGenerate(decodeURIComponent(promptFromUrl));
      router.replace("/builder");
    }
  }, [promptFromUrl, status, generate, router]);

  // Update URL when sessionId is set from streaming
  useEffect(() => {
    if (sessionId && !sessionIdFromUrl) {
      router.replace(`?sessionId=${sessionId}`);
    }
  }, [sessionId, sessionIdFromUrl, router]);

  // Derive an app name from blueprint or default
  const appName = typeof blueprint?.title === "string" ? blueprint.title : "Untitled App";

  async function handlePublish() {
    if (!sessionId || isPublishing) return;

    setIsPublishing(true);
    try {
      const result = await publishApp({
        sessionId: sessionId as Id<"sessions">,
        title: appName,
      });
      setPublishedUrl(result.deploymentUrl);
      setPublishModalOpen(true);
    } catch (err) {
      console.error("Publish failed:", err);
      toast.error("Publishing failed. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  }

  const showPromptScreen = !sessionId && status === "idle" && !sessionIdFromUrl;

  const THERAPY_SUGGESTIONS = [
    "Token board with star rewards for completing morning tasks",
    "Visual daily schedule with drag-to-reorder steps",
    "Communication picture board with text-to-speech",
    "Feelings check-in tool with emoji faces and journaling",
  ];

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    handleGenerate(promptInput.trim());
    setPromptInput("");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showPromptScreen ? (
        /* Phase 1: Full-width centered prompt — no session yet */
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <h1 className="font-headline text-3xl font-semibold text-foreground">
              What would you like to build?
            </h1>
            <p className="mt-2 text-base text-on-surface-variant">
              Describe a therapy tool and I&apos;ll build it for you.
            </p>
          </div>
          <form
            onSubmit={handlePromptSubmit}
            className="w-full max-w-2xl"
          >
            <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
              <Input
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Describe the therapy tool you want to build…"
                className="flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                aria-label="Describe the therapy tool you want to build"
              />
              <Button
                type="submit"
                disabled={!promptInput.trim()}
                size="icon"
                className="shrink-0 rounded-full"
                aria-label="Generate app"
              >
                <MaterialIcon icon="auto_fix_high" size="xs" />
              </Button>
            </div>
          </form>
          <SuggestionChips
            suggestions={THERAPY_SUGGESTIONS}
            onSelect={(suggestion) => {
              handleGenerate(suggestion);
            }}
          />
        </div>
      ) : (
        /* Phase 2+: Split-panel layout with toolbar */
        <>
          <BuilderToolbar
            view={viewMode}
            onViewChange={setViewMode}
            deviceSize={deviceSize}
            onDeviceSizeChange={setDeviceSize}
            status={status}
            wcStatus={wcStatus}
            isPublishing={isPublishing}
            projectName={appName}
            isEditingName={isEditingName}
            onNameEditStart={() => setIsEditingName(true)}
            onNameEditEnd={handleNameEditEnd}
            onShare={() => setShareDialogOpen(true)}
            onPublish={handlePublish}
            isMobile={isMobile}
            mobilePanel={mobilePanel}
            onMobilePanelChange={setMobilePanel}
          />

          <div className="min-h-0 flex-1 bg-surface-container-low p-2">
            {isMobile ? (
              /* Mobile: single-panel view toggled via toolbar */
              <div className="h-full">
                {mobilePanel === "chat" ? (
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <ChatPanel
                      sessionId={sessionId}
                      status={status}
                      blueprint={blueprint}
                      error={error}
                      onGenerate={handleGenerate}
                      onRetry={handleRetry}
                      streamingText={streamingText}
                      activities={activities}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <PreviewPanel
                      previewUrl={previewUrl}
                      state={status}
                      wcStatus={wcStatus}
                      error={error ?? wcError ?? undefined}
                      deviceSize="mobile"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: resizable side-by-side panels */
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={30} minSize={20}>
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <ChatPanel
                      sessionId={sessionId}
                      status={status}
                      blueprint={blueprint}
                      error={error}
                      onGenerate={handleGenerate}
                      onRetry={handleRetry}
                      streamingText={streamingText}
                      activities={activities}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {viewMode === "code" && (
                  <>
                    <ResizablePanel defaultSize={35} minSize={20}>
                      <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                        <CodePanel files={files} status={status} />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                  </>
                )}

                {viewMode === "preview" && (
                  <ResizablePanel defaultSize={70} minSize={20}>
                    <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                      <PreviewPanel
                        previewUrl={previewUrl}
                        state={status}
                        wcStatus={wcStatus}
                        error={error ?? wcError ?? undefined}
                        deviceSize={deviceSize}
                      />
                    </div>
                  </ResizablePanel>
                )}
              </ResizablePanelGroup>
            )}
          </div>
        </>
      )}

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareSlug={sessionId ?? "preview"}
        appTitle={appName}
      />

      <PublishSuccessModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        projectName={appName}
        publishedUrl={publishedUrl ?? ""}
        onBackToBuilder={() => {
          setPublishModalOpen(false);
          setPublishedUrl(null);
        }}
      />
    </div>
  );
}
