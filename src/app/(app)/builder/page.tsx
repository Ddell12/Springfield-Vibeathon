"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { BuilderHeader } from "@/features/builder/components/builder-header";
import { BuilderLayout } from "@/features/builder/components/builder-layout";
import { BridgesChat } from "@/features/builder/components/chat/bridges-chat";
import { ToolPreview } from "@/features/builder/components/tool-preview";
import { useBuilderState } from "@/features/builder/hooks/use-builder-state";

export default function BuilderPage() {
  const { threadId, toolId, setThreadId, setToolId, reset } = useBuilderState();
  const createThread = useMutation(api.chat.streaming.createNewThread);

  // Rehydrate persisted state from localStorage on client mount
  useEffect(() => {
    useBuilderState.persist.rehydrate();
  }, []);

  // Create a thread on first render (after rehydration)
  useEffect(() => {
    if (!threadId) {
      createThread({}).then((id) => {
        setThreadId(id);
      });
    }
  }, [threadId]); // re-run after rehydration sets threadId

  // Query for tools linked to this thread (reactive — auto-updates when AI creates a tool)
  const threadTools = useQuery(
    api.tools.getByThread,
    threadId ? { threadId } : "skip"
  );

  // When a new tool appears for this thread, set it as the active tool
  useEffect(() => {
    if (threadTools && threadTools.length > 0) {
      const latestTool = threadTools[threadTools.length - 1];
      if (latestTool._id !== toolId) {
        setToolId(latestTool._id);
      }
    }
  }, [threadTools, toolId, setToolId]);

  const activeTool = threadTools?.find((t) => t._id === toolId);

  function handleNewTool() {
    reset();
  }

  return (
    <div className="flex flex-col h-full">
      <BuilderHeader
        toolName={activeTool?.title}
        shareSlug={activeTool?.shareSlug}
        onNewTool={handleNewTool}
      />
      <div className="flex-1 overflow-hidden">
        <BuilderLayout
          chatPanel={<BridgesChat threadId={threadId} />}
          previewPanel={<ToolPreview toolId={toolId} />}
        />
      </div>
    </div>
  );
}
