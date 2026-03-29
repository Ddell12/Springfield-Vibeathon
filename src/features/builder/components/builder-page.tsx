"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
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
import { useProgressNarration } from "../hooks/use-progress-narration";
import { useSessionResume } from "../hooks/use-session-resume";
import { useStreaming } from "../hooks/use-streaming";
import { THERAPY_SUGGESTIONS } from "../lib/constants";
import type { TherapyBlueprint } from "../lib/schemas";
import { BuilderToolbar, type DeviceSize, type ViewMode } from "./builder-toolbar";
import { ChatPanel } from "./chat-panel";
import { CodePanel } from "./code-panel";
import { PatientContextCard } from "./patient-context-card";
import { ContinueCard } from "./continue-card";
import { InterviewController } from "./interview/interview-controller";
import { PreviewPanel } from "./preview-panel";

interface BuilderPageProps {
  initialSessionId: string | null;
}

export function BuilderPage({ initialSessionId }: BuilderPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") as Id<"patients"> | null;

  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [continueDismissed, setContinueDismissed] = useState(false);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const ensureApp = useMutation(api.apps.ensureForSession);
  const assignMaterial = useMutation(api.patientMaterials.assign);
  const patientData = useQuery(
    api.patients.get,
    patientId ? { patientId } : "skip",
  );
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
    notableMessage,
    reset,
  } = useStreaming();

  const narrationMessage = useProgressNarration(status, notableMessage ?? undefined);

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

  // Auto-switch to preview when bundle first arrives (perceived speed boost)
  // Only triggers on bundleHtml changes — not on viewMode changes, which would
  // prevent the user from switching to the code view via "View source".
  useEffect(() => {
    if (bundleHtml) startTransition(() => setViewMode("preview"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleHtml]);

  useEffect(() => {
    if (bundleHtml && mobilePanel !== "preview") startTransition(() => setMobilePanel("preview"));
  }, [bundleHtml, mobilePanel]);

  const handleGenerate = useCallback((prompt: string, blueprint?: TherapyBlueprint) => {
    lastPromptRef.current = prompt;
    setPendingPrompt(prompt);
    generate(prompt, blueprint ?? undefined, patientId ?? undefined);
  }, [generate, patientId]);

  const handleRetry = useCallback(() => {
    if (lastPromptRef.current) {
      generate(lastPromptRef.current, undefined, patientId ?? undefined);
    }
  }, [generate, patientId]);

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

  // Assignment toast: prompt to link the built app to a patient's materials
  const assignToastShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "live" || !patientId || !sessionId) return;
    if (assignToastShownRef.current === sessionId) return;
    assignToastShownRef.current = sessionId;

    const firstName = patientData?.firstName ?? "patient";

    toast(`App ready · Assign to ${firstName}'s materials?`, {
      duration: 15_000,
      action: {
        label: "Assign",
        onClick: async () => {
          try {
            await assignMaterial({ patientId, sessionId: sessionId as Id<"sessions">, fromGeneration: true });
            toast.success(`Added to ${firstName}'s materials`);
          } catch {
            toast.error("Failed to assign material");
          }
        },
      },
      cancel: {
        label: "Skip",
        onClick: () => {},
      },
    });
  }, [status, patientId, sessionId, patientData?.firstName, assignMaterial]);

  // Auto-save to My Apps when generation completes
  const autoSavedRef = useRef(false);
  useEffect(() => {
    if (status === "live" && activeSessionId && !appRecord && !autoSavedRef.current) {
      autoSavedRef.current = true;
      ensureApp({ sessionId: activeSessionId as Id<"sessions">, title: appName })
        .then(() => toast.success("Saved to My Apps!"))
        .catch(() => {}); // Silently fail — user can retry with Save button
    }
    if (status === "generating") autoSavedRef.current = false;
  }, [status, activeSessionId, appRecord, appName, ensureApp]);

  async function handleSave() {
    if (!activeSessionId) return;
    try {
      await ensureApp({
        sessionId: activeSessionId as Id<"sessions">,
        title: appName,
      });
      toast.success("Saved to My Apps!");
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error("Could not save — please try again");
    }
  }

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
          {patientId && (
            <div className="w-full max-w-2xl">
              <PatientContextCard patientId={patientId} />
            </div>
          )}
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
            projectName={appName}
            isEditingName={isEditingName}
            onNameEditStart={() => setIsEditingName(true)}
            onNameEditEnd={handleNameEditEnd}
            onSave={handleSave}
            isSaved={!!appRecord}
            onShare={handleShare}
            onNewChat={() => {
              reset();
              router.push("/builder");
            }}
            isMobile={isMobile}
            mobilePanel={mobilePanel}
            onMobilePanelChange={setMobilePanel}
            hasFiles={files.length > 0}
          />

          <div className="min-h-0 flex-1 bg-surface-container-low p-2">
            {isMobile ? (
              /* Mobile: single-panel view toggled via toolbar */
              <div className="h-full">
                {mobilePanel === "chat" ? (
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest">
                    {patientId && <PatientContextCard patientId={patientId} />}
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
                      narrationMessage={narrationMessage}
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
                      activityMessage={narrationMessage ?? undefined}
                      onRetry={handleRetry}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: resizable side-by-side panels */
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize={30} minSize={20}>
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest">
                    {patientId && <PatientContextCard patientId={patientId} />}
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
                      narrationMessage={narrationMessage}
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
                        activityMessage={narrationMessage ?? undefined}
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
      />
    </div>
  );
}
