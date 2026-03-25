"use client";

import { useRouter,useSearchParams } from "next/navigation";
import { useEffect } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { useStreaming } from "../hooks/use-streaming";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";

export function BuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdFromUrl = searchParams.get("sessionId");

  const { status, files, generate, blueprint, error, previewUrl, sessionId } =
    useStreaming();

  // Update URL when sessionId is set from streaming
  useEffect(() => {
    if (sessionId && !sessionIdFromUrl) {
      router.replace(`?sessionId=${sessionId}`);
    }
  }, [sessionId, sessionIdFromUrl, router]);

  const session = {
    state: status,
    previewUrl: previewUrl ?? undefined,
    error: error ?? undefined,
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Chat Panel — left */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <ChatPanel
            sessionId={null}
            status={status}
            blueprint={blueprint}
            error={error}
            onGenerate={generate}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Code Panel — middle */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <CodePanel files={files} status={status} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview Panel — right */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <PreviewPanel session={session} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
