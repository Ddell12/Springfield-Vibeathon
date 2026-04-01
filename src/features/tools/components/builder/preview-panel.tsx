"use client";

import { RuntimeShell } from "../../lib/runtime/runtime-shell";
import { useVoiceController } from "../../lib/runtime/runtime-voice-controller";
import { templateRegistry } from "../../lib/registry";

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
        <RuntimeShell mode="preview">
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
