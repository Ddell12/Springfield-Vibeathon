"use client";

import { useRef, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { templateRegistry } from "../../lib/registry";
import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";
import { FullscreenPreviewButton } from "./fullscreen-preview-button";

interface PreviewPanelProps {
  templateType: string;
  config: unknown;
}

export function PreviewPanel({ templateType, config }: PreviewPanelProps) {
  const voice = useVoiceController();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const registration = templateRegistry[templateType];

  if (!registration) return null;

  const { Runtime } = registration;
  const title = (config as { title?: string }).title ?? registration.meta.name;
  const shell = registration.shell ?? DEFAULT_APP_SHELL;

  async function handleBrowserFullscreen() {
    try {
      await containerRef.current?.requestFullscreen?.();
    } catch {
      // Browser fullscreen not supported or denied — stay in overlay mode
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full overflow-y-auto bg-muted/30 p-4",
        isFullscreen && "fixed inset-0 z-50 bg-background p-6"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        {!isFullscreen ? (
          <FullscreenPreviewButton
            onOpen={() => setIsFullscreen(true)}
            onBrowserFullscreen={handleBrowserFullscreen}
          />
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(false)}
            >
              Exit full screen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBrowserFullscreen}
            >
              Browser fullscreen
            </Button>
          </div>
        )}
      </div>
      <div className="mx-auto max-w-lg overflow-hidden rounded-xl bg-background shadow-sm">
        <RuntimeShell mode="preview" shell={shell} title={title}>
          <Runtime
            config={config}
            mode="preview"
            onEvent={() => undefined}
            voice={voice}
          />
        </RuntimeShell>
      </div>
    </div>
  );
}
