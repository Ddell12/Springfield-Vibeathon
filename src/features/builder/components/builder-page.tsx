"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { ShareDialog } from "@/features/sharing/components/share-dialog";

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

  const { status: wcStatus, previewUrl, writeFile, error: wcError } = useWebContainer();

  const { status, files, generate, blueprint, error, sessionId } =
    useStreaming({
      onFileComplete: writeFile,
    });

  // Auto-submit prompt from URL query param (e.g., from template chips)
  const promptSubmitted = useRef(false);
  const promptFromUrl = searchParams.get("prompt");

  useEffect(() => {
    if (promptFromUrl && status === "idle" && !promptSubmitted.current) {
      promptSubmitted.current = true;
      generate(decodeURIComponent(promptFromUrl));
      router.replace("/builder");
    }
  }, [promptFromUrl, status, generate, router]);

  // Update URL when sessionId is set from streaming
  useEffect(() => {
    if (sessionId && !sessionIdFromUrl) {
      router.replace(`?sessionId=${sessionId}`);
    }
  }, [sessionId, sessionIdFromUrl, router]);

  // Derive a project name from blueprint or default
  const projectName = typeof blueprint?.name === "string" ? blueprint.name : "Untitled App";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <BuilderToolbar
        view={viewMode}
        onViewChange={setViewMode}
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        status={status}
        projectName={projectName}
        onShare={() => setShareDialogOpen(true)}
        onPublish={() => setPublishModalOpen(true)}
      />

      <div className="min-h-0 flex-1 bg-surface-container-low p-2">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full overflow-hidden rounded-2xl bg-surface-container-lowest">
              <ChatPanel
                sessionId={null}
                status={status}
                blueprint={blueprint}
                error={error}
                onGenerate={generate}
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
            <ResizablePanel defaultSize={viewMode === "preview" ? 70 : 35} minSize={20}>
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
        toolTitle={projectName}
      />

      <PublishSuccessModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        projectName={projectName}
        publishedUrl={`https://bridges.app/tool/${sessionId ?? "preview"}`}
        onBackToBuilder={() => setPublishModalOpen(false)}
      />
    </div>
  );
}
