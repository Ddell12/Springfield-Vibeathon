"use client";

import { useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/shared/components/ui/resizable";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";
import { PhaseTimeline } from "./phase-timeline";
import { useSession, useSessionPhases } from "../hooks/use-session";

export function BuilderPage() {
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const session = useSession(sessionId);
  const phases = useSessionPhases(sessionId);
  const startBuild = useMutation(api.sessions.startBuild);

  const handleSubmit = async (prompt: string) => {
    const id = await startBuild({ title: "New App", query: prompt });
    setSessionId(id);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Chat Panel — left */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <ChatPanel
            sessionId={sessionId}
            session={session}
            onSubmit={handleSubmit}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Code Panel — middle */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <CodePanel sessionId={sessionId} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview Panel — right */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <PreviewPanel session={session} />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Phase Timeline — bottom */}
      {phases && phases.length > 0 && (
        <PhaseTimeline
          phases={phases}
          currentIndex={session?.currentPhaseIndex ?? 0}
        />
      )}
    </div>
  );
}
