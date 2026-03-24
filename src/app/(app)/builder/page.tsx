"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { BuilderLayout } from "@/features/builder/components/builder-layout";
import { BridgesChat } from "@/features/builder/components/chat/bridges-chat";
import { ToolPreview } from "@/features/builder/components/tool-preview";
import { useBuilderState } from "@/features/builder/hooks/use-builder-state";

export default function BuilderPage() {
  const { threadId, toolId, setThreadId, setToolId } = useBuilderState();
  const createThread = useMutation(api.chat.streaming.createNewThread);

  // Create a thread on first render
  useEffect(() => {
    if (!threadId) {
      createThread({}).then((id) => {
        setThreadId(id);
      });
    }
  }, []); // intentionally empty deps — only run once

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

  return (
    <BuilderLayout
      chatPanel={<BridgesChat threadId={threadId} />}
      previewPanel={<ToolPreview toolId={toolId} />}
    />
  );
}
