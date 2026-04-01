"use client";

import { templateRegistry } from "../../lib/registry";

interface PreviewPanelProps {
  templateType: string;
  config: unknown;
}

const noop = () => undefined;

export function PreviewPanel({ templateType, config }: PreviewPanelProps) {
  const registration = templateRegistry[templateType];
  if (!registration) return null;
  const { Runtime } = registration;
  return (
    <div className="h-full overflow-y-auto bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wide">
        Preview — child view
      </p>
      <div className="bg-background rounded-xl overflow-hidden shadow-sm max-w-lg mx-auto">
        <Runtime config={config} shareToken="preview" onEvent={noop} />
      </div>
    </div>
  );
}
