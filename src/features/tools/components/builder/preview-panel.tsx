"use client";

import { DEFAULT_APP_SHELL } from "../../lib/runtime/app-shell-types";
import { templateRegistry } from "../../lib/registry";
import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";

interface PreviewPanelProps {
  templateType: string;
  config: unknown;
}

export function PreviewPanel({ templateType, config }: PreviewPanelProps) {
  const voice = useVoiceController();
  const registration = templateRegistry[templateType];
  if (!registration) return null;
  const { Runtime } = registration;
  return (
    <div className="h-full overflow-y-auto bg-muted/30 p-4">
      <div className="bg-background rounded-xl overflow-hidden shadow-sm max-w-lg mx-auto">
        <RuntimeShell mode="preview" shell={DEFAULT_APP_SHELL} title="App">
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
