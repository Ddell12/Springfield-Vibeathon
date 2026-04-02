"use client";

import { useRef, useState } from "react";

import { Smartphone, Tablet } from "lucide-react";

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
  const [device, setDevice] = useState<"tablet" | "phone">("tablet");
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
          <div className="flex items-center gap-2">
            <FullscreenPreviewButton
              onOpen={() => setIsFullscreen(true)}
              onBrowserFullscreen={handleBrowserFullscreen}
            />
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setDevice("tablet")}
                aria-pressed={device === "tablet"}
                aria-label="Tablet view"
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  device === "tablet"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Tablet className="w-3.5 h-3.5" />
                Tablet
              </button>
              <button
                type="button"
                onClick={() => setDevice("phone")}
                aria-pressed={device === "phone"}
                aria-label="Phone view"
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  device === "phone"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Phone
              </button>
            </div>
          </div>
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
      <div className={cn("mx-auto overflow-hidden rounded-xl bg-background shadow-sm", device === "tablet" ? "max-w-[768px]" : "max-w-[390px]")}>
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
