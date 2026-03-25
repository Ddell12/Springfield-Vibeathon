"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { ShareDialog } from "@/features/sharing/components/share-dialog";
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

const MOBILE_QUERY = "(max-width: 767px)";
const subscribe = (cb: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getSnapshot = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
const getServerSnapshot = () => false;

export function BuilderPage() {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromUrl = searchParams.get("sessionId");

  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const publishApp = useAction(api.publish.publishApp);

  const { status: wcStatus, previewUrl, writeFile, error: wcError } = useWebContainer();

  const {
    status,
    files,
    generate,
    resumeSession,
    blueprint,
    appName: streamedAppName,
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

  // Auto-switch to preview on mobile when generation starts
  const prevStatus = useRef(status);
  useEffect(() => {
    if (isMobile && prevStatus.current === "idle" && status === "generating") {
      setMobilePanel("preview");
    }
    prevStatus.current = status;
  }, [isMobile, status]);

  // Editable app name: streamed from AI → user can override
  const [editedName, setEditedName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const updateTitle = useMutation(api.sessions.updateTitle);

  const displayName = editedName ?? streamedAppName ?? (typeof blueprint?.title === "string" ? blueprint.title : "Untitled App");

  const handleNameEditEnd = useCallback(
    (name: string) => {
      setIsEditingName(false);
      const trimmed = name.trim();
      if (trimmed && trimmed !== displayName) {
        setEditedName(trimmed);
        if (sessionId) {
          updateTitle({ sessionId: sessionId as Id<"sessions">, title: trimmed }).catch(
            (err: unknown) => console.error("Failed to update title:", err)
          );
        }
      }
    },
    [displayName, sessionId, updateTitle]
  );

  async function handlePublish() {
    if (!sessionId || isPublishing) return;

    setIsPublishing(true);
    try {
      const result = await publishApp({
        sessionId: sessionId as Id<"sessions">,
        title: displayName,
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <BuilderToolbar
        view={viewMode}
        onViewChange={setViewMode}
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        status={status}
        wcStatus={wcStatus}
        isPublishing={isPublishing}
        projectName={displayName}
        isEditingName={isEditingName}
        onNameEditStart={() => setIsEditingName(true)}
        onNameEditEnd={handleNameEditEnd}
        onShare={() => setShareDialogOpen(true)}
        onPublish={handlePublish}
      />

      {isMobile ? (
        <div className="min-h-0 flex-1 bg-surface-container-low p-2">
          {mobilePanel === "chat" ? (
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface-container-lowest">
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
              {status !== "idle" && (
                <button
                  onClick={() => setMobilePanel("preview")}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary-container py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                >
                  View Preview
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <button
                onClick={() => setMobilePanel("chat")}
                className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-surface-container-high py-2 text-sm font-medium text-on-surface-variant transition-all active:scale-95"
              >
                Back to Chat
              </button>
              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface-container-lowest">
                {viewMode === "code" ? (
                  <CodePanel files={files} status={status} />
                ) : (
                  <PreviewPanel
                    previewUrl={previewUrl}
                    state={status}
                    wcStatus={wcStatus}
                    error={error ?? wcError ?? undefined}
                    deviceSize={deviceSize}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 bg-surface-container-low p-2">
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
        </div>
      )}

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareSlug={sessionId ?? "preview"}
        appTitle={displayName}
      />

      <PublishSuccessModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        projectName={displayName}
        publishedUrl={publishedUrl ?? ""}
        onBackToBuilder={() => {
          setPublishModalOpen(false);
          setPublishedUrl(null);
        }}
      />
    </div>
  );
}
