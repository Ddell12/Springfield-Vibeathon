"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";

interface PreviewPanelProps {
  session: {
    previewUrl?: string;
    state: string;
    stateMessage?: string;
  } | null | undefined;
}

const RESPONSIVE_SIZES = [
  { label: "Mobile", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: "100%" as const },
];

export function PreviewPanel({ session }: PreviewPanelProps) {
  const [sizeIndex, setSizeIndex] = useState(2); // Default: desktop
  const currentSize = RESPONSIVE_SIZES[sizeIndex];

  const isDeploying = session?.state === "deploying";
  const hasPreview = !!session?.previewUrl;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
        <div className="flex gap-1">
          {RESPONSIVE_SIZES.map((size, i) => (
            <Button
              key={size.label}
              variant={sizeIndex === i ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSizeIndex(i)}
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30 p-4">
        {isDeploying ? (
          <div className="animate-pulse text-sm text-muted-foreground">
            Deploying to preview...
          </div>
        ) : hasPreview ? (
          <iframe
            src={session!.previewUrl}
            className="h-full rounded-lg border bg-white shadow-sm"
            style={{
              width:
                typeof currentSize.width === "number"
                  ? `${currentSize.width}px`
                  : "100%",
              maxWidth: "100%",
            }}
            title="App Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>Your app preview will appear here.</p>
            {session?.stateMessage && (
              <p className="mt-1 text-xs">{session.stateMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
