"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { extractErrorMessage } from "@/core/utils";
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
import { useStreaming } from "../hooks/use-streaming";
import { THERAPY_SUGGESTIONS } from "../lib/constants";
import { BuilderToolbar, type DeviceSize, type ViewMode } from "./builder-toolbar";
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
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [continueDismissed, setContinueDismissed] = useState(false);
  const publishApp = useAction(api.publish.publishApp);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const ensureApp = useMutation(api.apps.ensureForSession);
  const [isEditingName, setIsEditingName] = useState(false);
  const [promptInput, setPromptInput] = useState("");

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

  // Auto-switch to preview when bundle is ready (perceived speed boost)
  useEffect(() => {
    if (bundleHtml && viewMode !== "preview") setViewMode("preview");
  }, [bundleHtml, viewMode]);

  useEffect(() => {
    if (bundleHtml && mobilePanel !== "preview") setMobilePanel("preview");
  }, [bundleHtml, mobilePanel]);

  // Session resume: fetch session + files when initialSessionId is provided (path-based URL)
  const resumeSessionData = useQuery(
    api.sessions.get,
    initialSessionId ? { sessionId: initialSessionId as Id<"sessions"> } : "skip"
  );
  const resumeFiles = useQuery(
    api.generated_files.list,
    initialSessionId ? { sessionId: initialSessionId as Id<"sessions"> } : "skip"
  );

  const activeSessionId = sessionId ?? initialSessionId;
  const currentSession = useQuery(
    api.sessions.get,
    activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
  );
  const appRecord = useQuery(
    api.apps.getBySession,
    activeSessionId ? { sessionId: activeSessionId as Id<"sessions"> } : "skip"
  );
  // Used for the "Continue where you left off" card on the prompt screen
  const mostRecent = useQuery(api.sessions.getMostRecent, initialSessionId ? "skip" : {});

  // Resume an existing session when navigating from My Apps or refreshing /builder/{id}
  const sessionResumed = useRef(false);
  useEffect(() => {
    if (
      initialSessionId &&
      resumeSessionData &&
      resumeFiles &&
      status === "idle" &&
      !sessionResumed.current
    ) {
      sessionResumed.current = true;

      // Separate the persisted bundle from user-visible files
      const bundleFile = resumeFiles.find((f) => f.path === "_bundle.html");
      const appFiles = resumeFiles.filter((f) => f.path !== "_bundle.html");

      // Restore streaming hook state
      resumeSession({
        sessionId: initialSessionId,
        files: appFiles.map((f) => ({ path: f.path, contents: f.contents })),
        blueprint: resumeSessionData.blueprint ?? null,
        bundleHtml: bundleFile?.contents ?? null,
      });
    }
  }, [initialSessionId, resumeSessionData, resumeFiles, status, resumeSession]);

  // Auto-submit prompt from URL query param (e.g., from template chips)
  const promptSubmitted = useRef(false);
  const lastPromptRef = useRef<string>("");

  const handleGenerate = useCallback((prompt: string) => {
    lastPromptRef.current = prompt;
    generate(prompt);
  }, [generate]);

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
    if (promptFromUrl && status === "idle" && !promptSubmitted.current && !initialSessionId) {
      promptSubmitted.current = true;
      handleGenerate(decodeURIComponent(promptFromUrl));
    }
  }, [promptFromUrl, status, handleGenerate, initialSessionId]);

  // Navigate to path-based URL when SSE creates a new session mid-generation
  useEffect(() => {
    if (sessionId && !initialSessionId) {
      router.replace(`/builder/${sessionId}`);
    }
  }, [sessionId, initialSessionId, router]);

  // Redirect to /builder if the session doesn't exist in Convex (deleted or invalid ID)
  useEffect(() => {
    if (initialSessionId && resumeSessionData === null && resumeFiles !== undefined) {
      router.replace("/builder");
    }
  }, [initialSessionId, resumeSessionData, resumeFiles, router]);

  // Derive app name: prefer Convex session title (reactive) > blueprint > default
  const appName = currentSession?.title
    ?? (typeof blueprint?.title === "string" ? blueprint.title : "Untitled App");

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
      toast.error(extractErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleShare() {
    if (activeSessionId) {
      try {
        await ensureApp({
          sessionId: activeSessionId as Id<"sessions">,
          title: appName,
        });
      } catch (err) {
        console.error("Failed to create share link:", err);
      }
    }
    setShareDialogOpen(true);
  }

  const showPromptScreen = !sessionId && status === "idle" && !initialSessionId;

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
              sessionResumed.current = false;
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
                        bundleHtml={bundleHtml}
                        state={status}
                        error={error ?? undefined}
                        deviceSize={deviceSize}
                        buildFailed={buildFailed}
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
        shareSlug={appRecord?.shareSlug ?? sessionId ?? "preview"}
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
