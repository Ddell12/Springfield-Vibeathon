"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { templateRegistry } from "../../lib/registry";
import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";
import { SessionBanner } from "./session-banner";
import { SessionOverlay, type SessionEvent } from "./session-overlay";

interface ToolRuntimePageProps {
  shareToken: string;
  templateType: string;
  configJson: string;
  patientName?: string;
}

export function ToolRuntimePage({ shareToken, templateType, configJson, patientName }: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);
  const voice = useVoiceController();
  const searchParams = useSearchParams();
  const isSession = searchParams.get("session") === "true";

  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const sessionStartMs = useRef(Date.now());
  const [showSummary, setShowSummary] = useState(false);

  const registration = templateRegistry[templateType];
  if (!registration) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Unknown tool type.
      </div>
    );
  }

  const config = registration.parseConfig(configJson);
  const title = (config as { title?: string }).title ?? registration.meta.name;
  const { Runtime } = registration;

  const handleEvent = (eventType: string, payloadJson?: string) => {
    void logEvent({
      shareToken,
      eventType: eventType as Parameters<typeof logEvent>[0]["eventType"],
      eventPayloadJson: payloadJson,
    });
    if (isSession) {
      setSessionEvents((prev) => [...prev, { type: eventType, payloadJson, timestamp: Date.now() }]);
    }
  };

  const handleExit = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {isSession && <SessionBanner patientName={patientName} />}

      <RuntimeShell mode="published" shell={DEFAULT_APP_SHELL} title={title} onExit={handleExit}>
        <Runtime config={config} mode="published" onEvent={handleEvent} voice={voice} />
      </RuntimeShell>

      {isSession && !showSummary && (
        <SessionOverlay
          events={sessionEvents}
          startTimeMs={sessionStartMs.current}
          toolTitle={title}
          templateType={templateType}
          onEndSession={() => { handleEvent("app_closed"); setShowSummary(true); }}
        />
      )}

      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-background rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <h2 className="font-headline text-xl font-semibold">Session summary</h2>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Tool: {title}</p>
              <p>Events: {sessionEvents.length}</p>
              <p>
                Completions: {sessionEvents.filter((e) => e.type === "activity_completed").length}
              </p>
              <p>
                Duration:{" "}
                {Math.floor((Date.now() - sessionStartMs.current) / 60000)} min{" "}
                {Math.floor(((Date.now() - sessionStartMs.current) % 60000) / 1000)} sec
              </p>
            </div>
            <button type="button" onClick={handleExit}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
