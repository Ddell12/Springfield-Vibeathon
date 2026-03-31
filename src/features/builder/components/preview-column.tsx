"use client";

import { toast } from "sonner";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { StreamingFile, StreamingStatus } from "../hooks/use-streaming";
import { CodePanel } from "./code-panel";
import { PreviewPanel } from "./preview-panel";

export type DeviceSize = "mobile" | "desktop";
export type ViewMode = "preview" | "code";

interface PreviewColumnProps {
  bundleHtml: string | null;
  status: StreamingStatus;
  error?: string;
  deviceSize: DeviceSize;
  buildFailed: boolean;
  activityMessage?: string;
  onRetry?: () => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  files: StreamingFile[];
  onPublish?: () => void;
  onClose?: () => void;
}

export function PreviewColumn({
  bundleHtml,
  status,
  error,
  deviceSize,
  buildFailed,
  activityMessage,
  onRetry,
  viewMode,
  onViewChange,
  files,
  onPublish,
  onClose,
}: PreviewColumnProps) {
  const handleCopy = () => {
    if (!bundleHtml) return;
    navigator.clipboard.writeText(bundleHtml).then(() => {
      toast.success("Copied to clipboard");
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-outline-variant/20 px-3">
        {/* View toggle tabs */}
        <button
          type="button"
          aria-label="Preview"
          onClick={() => onViewChange("preview")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
            viewMode === "preview"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <MaterialIcon icon="visibility" size="xs" />
        </button>
        <button
          type="button"
          aria-label="Source"
          onClick={() => onViewChange("code")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
            viewMode === "code"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <MaterialIcon icon="code" size="xs" />
        </button>

        {/* Version label */}
        {bundleHtml && (
          <span className="text-xs text-on-surface-variant/50">v1</span>
        )}

        <div className="flex-1" />

        {/* Refresh */}
        {onRetry && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            onClick={onRetry}
            className="h-8 w-8 text-on-surface-variant hover:text-on-surface"
          >
            <MaterialIcon icon="refresh" size="xs" />
          </Button>
        )}

        {/* Copy */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Copy"
          onClick={handleCopy}
          disabled={!bundleHtml}
          className="h-8 gap-1 px-2 text-xs font-semibold text-on-surface-variant"
        >
          Copy
          <MaterialIcon icon="expand_more" size="xs" />
        </Button>

        {/* Publish */}
        <Button
          size="sm"
          aria-label="Share & Publish"
          onClick={onPublish}
          className="h-8 bg-gradient-to-br from-primary to-primary-container px-3 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          Share &amp; Publish
        </Button>

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={onClose}
          className="h-8 w-8 text-on-surface-variant hover:text-on-surface"
        >
          <MaterialIcon icon="close" size="xs" />
        </Button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === "preview" ? (
          <PreviewPanel
            bundleHtml={bundleHtml}
            state={status}
            error={error}
            deviceSize={deviceSize}
            buildFailed={buildFailed}
            activityMessage={activityMessage}
            onRetry={onRetry}
          />
        ) : (
          <CodePanel files={files} status={status} />
        )}
      </div>
    </div>
  );
}
