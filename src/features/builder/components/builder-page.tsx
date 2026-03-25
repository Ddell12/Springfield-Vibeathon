"use client";

import { useMutation } from "convex/react";
import { useRouter,useSearchParams } from "next/navigation";
import { Suspense,useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSession, useSessionPhases } from "../hooks/use-session";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PhaseTimeline } from "./phase-timeline";
import { PreviewPanel } from "./preview-panel";

function BuilderPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSessionId = searchParams.get("session") as Id<"sessions"> | null;
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(initialSessionId);
  const session = useSession(sessionId);
  const phases = useSessionPhases(sessionId);
  const startBuild = useMutation(api.sessions.startBuild);

  const handleSubmit = async (prompt: string) => {
    const id = await startBuild({ title: "New App", query: prompt });
    setSessionId(id);
    router.replace(`/builder?session=${id}`);
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
          <CodePanel sessionId={sessionId} session={session} />
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
          onPhaseClick={(index) => {
            void index; /* future: filter code panel by phase */
          }}
        />
      )}
    </div>
  );
}

export function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-surface">
          Loading...
        </div>
      }
    >
      <BuilderPageInner />
    </Suspense>
  );
}
