"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/core/hooks/use-mobile";
import { FullscreenAppView } from "@/shared/components/fullscreen-app-view";
import { ShareDialog } from "@/shared/components/share-dialog";
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
import type { TherapyBlueprint } from "../lib/schemas";
import { ChatColumn } from "./chat-column";
import { HomeScreen } from "./home-screen";
import { PreviewColumn, type DeviceSize, type ViewMode } from "./preview-column";

interface BuilderPageProps {
  initialSessionId: string | null;
}

export function BuilderPage({ initialSessionId }: BuilderPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPatientId = searchParams.get("patientId");
  // Validate patientId format to prevent Convex query crashes on invalid IDs
  const patientId = (rawPatientId && /^[a-z0-9]{32}$/.test(rawPatientId)
    ? rawPatientId
    : null) as Id<"patients"> | null;

  const isMobile = useIsMobile();
  // Note: mode is not reset by reset() — if a same-mount "New app" flow is added
  // that calls reset() without navigating away, mode will need to be explicitly reset.
  const [mode, setMode] = useState<"app" | "flashcards">("app");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");

  // Hydrate from localStorage after mount to avoid SSR/CSR mismatch
  const hasMounted = useRef(false);
  useEffect(() => {
    const savedView = localStorage.getItem("bridges-viewMode") as ViewMode | null;
    const savedDevice = localStorage.getItem("bridges-deviceSize") as DeviceSize | null;
    if (savedView) setViewMode(savedView); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage hydration
    if (savedDevice) setDeviceSize(savedDevice); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage hydration
    hasMounted.current = true;
  }, []);
  const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [continueDismissed, setContinueDismissed] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);
  const updateTitle = useMutation(api.sessions.updateTitle);
  const ensureApp = useMutation(api.apps.ensureForSession);
  const assignMaterial = useMutation(api.patientMaterials.assign);
  const patientData = useQuery(
    api.patients.getForContext,
    patientId ? { patientId } : "skip",
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const lastPromptRef = useRef("");
  const [generationStartTime, setGenerationStartTime] = useState<number>(() => Date.now());

  useEffect(() => { localStorage.setItem("bridges-viewMode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("bridges-deviceSize", deviceSize); }, [deviceSize]);

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
      try {
        resumeSession({
          sessionId: activeSessionId_forQuery!,
          files: files,
          blueprint: blueprint ?? null,
          bundleHtml: recoveredBundle.contents,
        });
      } catch {
        bundleRecoveredRef.current = false;
      }
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
  // Also re-show preview panel when a new bundle arrives (in case it was hidden)
  useEffect(() => {
    if (bundleHtml) {
      startTransition(() => setViewMode("preview"));
      setPreviewVisible(true);
    }
  }, [bundleHtml]);

  useEffect(() => {
    if (bundleHtml && mobilePanel !== "preview") startTransition(() => setMobilePanel("preview"));
  }, [bundleHtml, mobilePanel]);

  const handleGenerate = useCallback((prompt: string, blueprint?: TherapyBlueprint) => {
    setPendingPrompt(prompt);
    setGenerationStartTime(Date.now());
    const finalPrompt = mode === "flashcards" ? `[FLASHCARD MODE] ${prompt}` : prompt;
    lastPromptRef.current = finalPrompt;  // store the prefixed prompt so retries include mode
    generate(finalPrompt, blueprint ?? undefined, patientId ?? undefined);
  }, [generate, patientId, mode]);

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

  // Toast when navigating away during active generation (in-app navigation)
  const hasShownNavToastRef = useRef(false);
  useEffect(() => {
    if (status === "generating") {
      hasShownNavToastRef.current = false;
    }
    return () => {
      if (status === "generating" && !hasShownNavToastRef.current) {
        hasShownNavToastRef.current = true;
        toast.info("Building continues in the background — find it in Recents when it's ready.", { duration: 6000 });
      }
    };
  }, [status]);

  // Keyboard shortcut: Cmd/Ctrl + Shift + S toggles source/preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        setViewMode((prev) => (prev === "preview" ? "code" : "preview"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
    });
  }, [status, patientId, sessionId, patientData?.firstName, assignMaterial]);

  // Auto-save to My Apps when generation completes
  const autoSavedRef = useRef(false);
  useEffect(() => {
    if (status === "live" && activeSessionId && !appRecord && !autoSavedRef.current) {
      autoSavedRef.current = true;
      ensureApp({ sessionId: activeSessionId as Id<"sessions">, title: appName })
        .then(() => toast.success("Saved to My Apps!"))
        .catch((err) => {
          console.warn("[builder] Auto-save failed:", err);
        });
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

  const showPromptScreen = status === "idle" && !sessionId;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showPromptScreen ? (
        <HomeScreen
          onGenerate={handleGenerate}
          mostRecent={!continueDismissed ? mostRecent ?? null : null}
          onContinueDismiss={() => setContinueDismissed(true)}
        />
      ) : (
        <>
          {isMobile ? (
            /* Mobile: single-panel view toggled via ChatColumn header */
            <div className="flex h-full flex-col overflow-hidden">
              {mobilePanel === "chat" ? (
                <ChatColumn
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
                  appName={appName}
                  isEditingName={isEditingName}
                  onNameEditStart={() => setIsEditingName(true)}
                  onNameEditEnd={handleNameEditEnd}
                  patientId={patientId}
                  isMobile={isMobile}
                  mobilePanel={mobilePanel}
                  onMobilePanelChange={setMobilePanel}
                  mode={mode}
                  onModeChange={setMode}
                />
              ) : (
                <div className="flex h-full flex-col">
                  {/* Mobile panel back strip */}
                  <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-outline-variant/20 bg-surface px-4">
                    <button
                      type="button"
                      onClick={() => setMobilePanel("chat")}
                      className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface"
                    >
                      ← Back to chat
                    </button>
                  </div>
                  <PreviewColumn
                    bundleHtml={bundleHtml}
                    status={status}
                    error={error ?? undefined}
                    deviceSize="mobile"
                    buildFailed={buildFailed}
                    activityMessage={narrationMessage ?? undefined}
                    onRetry={handleRetry}
                    viewMode={viewMode}
                    onViewChange={setViewMode}
                    files={files}
                    onPublish={handleShare}
                    onClose={() => {
                      reset();
                      router.push("/builder");
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Desktop: resizable side-by-side columns, or chat-only when preview hidden */
            previewVisible ? (
              <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
                <ResizablePanel defaultSize={45} minSize={20}>
                  <ChatColumn
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
                    appName={appName}
                    isEditingName={isEditingName}
                    onNameEditStart={() => setIsEditingName(true)}
                    onNameEditEnd={handleNameEditEnd}
                    patientId={patientId}
                    onArtifactClick={() => setPreviewVisible(true)}
                    mode={mode}
                    onModeChange={setMode}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={55} minSize={20}>
                  <PreviewColumn
                    bundleHtml={bundleHtml}
                    status={status}
                    error={error ?? undefined}
                    deviceSize={deviceSize}
                    buildFailed={buildFailed}
                    activityMessage={narrationMessage ?? undefined}
                    onRetry={handleRetry}
                    viewMode={viewMode}
                    onViewChange={setViewMode}
                    files={files}
                    onPublish={handleShare}
                    onClose={() => setPreviewVisible(false)}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="flex flex-1 min-h-0 overflow-hidden">
                <ChatColumn
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
                  appName={appName}
                  isEditingName={isEditingName}
                  onNameEditStart={() => setIsEditingName(true)}
                  onNameEditEnd={handleNameEditEnd}
                  patientId={patientId}
                  onArtifactClick={() => setPreviewVisible(true)}
                  mode={mode}
                  onModeChange={setMode}
                />
              </div>
            )
          )}
        </>
      )}

      {isFullscreen && bundleHtml && (
        <FullscreenAppView
          bundleHtml={bundleHtml}
          onExit={() => setIsFullscreen(false)}
        />
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
