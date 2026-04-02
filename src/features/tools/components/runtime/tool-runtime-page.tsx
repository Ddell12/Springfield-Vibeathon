"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { templateRegistry } from "../../lib/registry";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";

interface ToolRuntimePageProps {
  shareToken: string;
  templateType: string;
  configJson: string;
}

export function ToolRuntimePage({ shareToken, templateType, configJson }: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);
  const voice = useVoiceController();

  const registration = templateRegistry[templateType];
  if (!registration) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Unknown tool type.
      </div>
    );
  }

  const config = registration.parseConfig(configJson);
  const { Runtime } = registration;

  const handleEvent = (eventType: string, payloadJson?: string) => {
    void logEvent({
      shareToken,
      eventType: eventType as Parameters<typeof logEvent>[0]["eventType"],
      eventPayloadJson: payloadJson,
    });
  };

  const handleExit = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };

  return (
    <RuntimeShell mode="published" shell={DEFAULT_APP_SHELL} title="App" onExit={handleExit}>
      <Runtime
        config={config}
        mode="published"
        onEvent={handleEvent}
        voice={voice}
      />
    </RuntimeShell>
  );
}
