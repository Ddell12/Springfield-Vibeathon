"use client";

import { useAction } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { useStreaming } from "../hooks/use-streaming";
import { useWebContainer } from "../hooks/use-webcontainer";
import { BuilderToolbar, type DeviceSize, type ViewMode } from "./builder-toolbar";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";
import { PublishSuccessModal } from "./publish-success-modal";

export function BuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromUrl = searchParams.get("sessionId");

  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
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
    blueprint,
    error,
    sessionId,
    streamingText,
    activities,
  } = useStreaming({
    onFileComplete: writeFile,
  });

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <BuilderToolbar
        view={viewMode}
        onViewChange={setViewMode}
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        status={status}
        projectName={appName}
        onShare={() => setShareDialogOpen(true)}
        onPublish={handlePublish}
      />

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
