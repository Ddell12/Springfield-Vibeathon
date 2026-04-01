"use client";

import { useMutation } from "convex/react";

import { api } from "@convex/_generated/api";
import { templateRegistry } from "../../lib/registry";

interface ToolRuntimePageProps {
  shareToken: string;
  templateType: string;
  configJson: string;
}

export function ToolRuntimePage({ shareToken, templateType, configJson }: ToolRuntimePageProps) {
  const logEvent = useMutation(api.tools.logEvent);

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

  return <Runtime config={config} shareToken={shareToken} onEvent={handleEvent} />;
}
