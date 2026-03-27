"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { MaterialIcon } from "@/shared/components/material-icon";
import { SuggestionChips } from "@/shared/components/suggestion-chips";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { usePublishing } from "../hooks/use-publishing";
import { useSessionResume } from "../hooks/use-session-resume";
import { useStreaming } from "../hooks/use-streaming";
import { THERAPY_SUGGESTIONS } from "../lib/constants";
import type { TherapyBlueprint } from "../lib/schemas";
import { BuilderToolbar, type DeviceSize, type ViewMode } from "./builder-toolbar";
import { InterviewController } from "./interview/interview-controller";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { ContinueCard } from "./continue-card";
import { PreviewPanel } from "./preview-panel";
import { PublishSuccessModal } from "./publish-success-modal";

interface BuilderPageProps {
  initialSessionId: string | null;
}

export function BuilderPage({ initialSessionId }: BuilderPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [continueDismissed, setContinueDismissed] = useState(false);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const ensureApp = useMutation(api.apps.ensureForSession);
  const [isEditingName, setIsEditingName] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const lastPromptRef = useRef("");
  const promptInputRef = useRef<HTMLInputElement>(null);
  const [showFreeformInput, setShowFreeformInput] = useState(false);

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
    bundleHtml,
    buildFailed,
    reset,
  } = useStreaming();

  // Fallback: recover bundle from Convex if SSE event was lost
  const activeSessionId_forQuery = sessionId ?? initialSessionId;
  const shouldRecoverBundle = status === "live" && !bundleHtml && !buildFailed && !!activeSessionId_forQuery;
  const recoveredBundle = useQuery(
    api.generated_files.getByPath,
    shouldRecoverBundle
      ? { sessionId: activeSessionId_forQuery as Id<"sessions">, path: "_bundle.html" }
      : "skip"
  );

  const bundleRecoveredRef = useRef(false);

  useEffect(() => {
    if (recoveredBundle?.contents && !bundleHtml && !bundleRecoveredRef.current) {
      bundleRecoveredRef.current = true;
      resumeSession({
        sessionId: activeSessionId_forQuery!,
        files: files,
        blueprint: blueprint ?? null,
        bundleHtml: recoveredBundle.contents,
      });
    }
  }, [recoveredBundle, bundleHtml, activeSessionId_forQuery, files, blueprint, resumeSession]);

  // Reset recovery guard when generation restarts
  useEffect(() => {
    if (status === "generating") {
      bundleRecoveredRef.current = false;
    }
  }, [status]);

  // Auto-switch to preview when bundle is ready (perceived speed boost)
  useEffect(() => {
    if (bundleHtml && viewMode !== "preview") setViewMode("preview");
  }, [bundleHtml, viewMode]);

  useEffect(() => {
    if (bundleHtml && mobilePanel !== "preview") setMobilePanel("preview");
  }, [bundleHtml, mobilePanel]);

  const handleGenerate = useCallback((prompt: string, blueprint?: TherapyBlueprint) => {
    lastPromptRef.current = prompt;
    setPendingPrompt(prompt);
    generate(prompt, blueprint);
  }, [generate]);

  const handleRetry = useCallback(() => {
    if (lastPromptRef.current) {
      generate(lastPromptRef.current);
    }
  }, [generate]);

  // Session resume & URL sync
  const {
    activeSessionId,
    currentSession,
    appRecord,
    mostRecent,
    handlePromptFromUrl,
  } = useSessionResume(initialSessionId, status, sessionId, resumeSession, handleGenerate);

  // Derive app name: prefer Convex session title (reactive) > blueprint > default
  const appName = currentSession?.title
    ?? (typeof blueprint?.title === "string" ? blueprint.title : "Untitled App");

  // Publishing
  const {
    isPublishing,
    publishedUrl,
    publishModalOpen,
    setPublishModalOpen,
    handlePublish,
    setPublishedUrl,
  } = usePublishing(sessionId, appName);

  // Auto-submit prompt from URL
  const promptFromUrl = searchParams.get("prompt");
  useEffect(() => {
    handlePromptFromUrl(promptFromUrl);
  }, [promptFromUrl, handlePromptFromUrl]);

  // Warn before leaving during active generation
  useEffect(() => {
    if (status !== "generating") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

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

  async function handleShare() {
    if (!activeSessionId) return;
    try {
      await ensureApp({
        sessionId: activeSessionId as Id<"sessions">,
        title: appName,
      });
    } catch (err) {
      console.error("Failed to create share link:", err);
      toast.error("Could not create share link");
      return;
    }
    setShareDialogOpen(true);
  }

  const showPromptScreen = !sessionId && status === "idle" && !initialSessionId;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showPromptScreen ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
          <div className="text-center">
            <h1 className="font-headline text-3xl font-semibold text-foreground">
              What would you like to build?
            </h1>
            <p className="mt-2 text-base text-on-surface-variant">
              Choose a category or describe what you need.
            </p>
          </div>

          {showFreeformInput ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!promptInput.trim()) return;
                  handleGenerate(promptInput.trim());
                  setPromptInput("");
                }}
                className="w-full max-w-2xl"
              >
                <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
                  <Input
                    ref={promptInputRef}
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
                onSelect={(suggestion) => handleGenerate(suggestion)}
              />
              <button
                type="button"
                onClick={() => setShowFreeformInput(false)}
                className="text-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
              >
                ← Back to categories
              </button>
            </>
          ) : (
            <div className="w-full max-w-2xl">
              <InterviewController
                onGenerate={(prompt, blueprint) => handleGenerate(prompt, blueprint)}
                onEscapeHatch={() => {
                  setShowFreeformInput(true);
                  setTimeout(() => promptInputRef.current?.focus(), 100);
                }}
              />
            </div>
          )}

          {mostRecent && !continueDismissed && (
            <ContinueCard
              sessionId={mostRecent._id}
              title={mostRecent.title}
              onDismiss={() => setContinueDismissed(true)}
            />
          )}
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
            isPublishing={isPublishing}
            projectName={appName}
            isEditingName={isEditingName}
            onNameEditStart={() => setIsEditingName(true)}
            onNameEditEnd={handleNameEditEnd}
            onShare={handleShare}
            onPublish={handlePublish}
            onNewChat={() => {
              reset();
              router.push("/builder");
            }}
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
                      pendingPrompt={pendingPrompt}
                      onPendingPromptClear={() => setPendingPrompt(null)}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
                    <PreviewPanel
                      bundleHtml={bundleHtml}
                      state={status}
                      error={error ?? undefined}
                      deviceSize="mobile"
                      buildFailed={buildFailed}
                      activityMessage={activities[activities.length - 1]?.message}
                      onRetry={handleRetry}
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
                      pendingPrompt={pendingPrompt}
                      onPendingPromptClear={() => setPendingPrompt(null)}
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
                        bundleHtml={bundleHtml}
                        state={status}
                        error={error ?? undefined}
                        deviceSize={deviceSize}
                        buildFailed={buildFailed}
                        activityMessage={activities[activities.length - 1]?.message}
                        onRetry={handleRetry}
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
        shareSlug={appRecord?.shareSlug ?? ""}
        appTitle={appName}
        publishedUrl={appRecord?.publishedUrl ?? publishedUrl ?? undefined}
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
