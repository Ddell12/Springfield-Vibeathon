"use client";

import { useMemo, useState } from "react";

import { copyToClipboard } from "@/core/clipboard";
import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import {
  isBusyStreamingStatus,
  type StreamingFile,
  type StreamingStatus,
} from "../hooks/use-streaming";

interface CodePanelProps {
  files: StreamingFile[];
  status: StreamingStatus;
}

export function CodePanel({ files, status }: CodePanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Resolve selected file: fall back to first file when selectedPath not yet set
  const selectedFile =
    files.find((f) => f.path === selectedPath) ?? files[0] ?? null;

  const isGenerating = isBusyStreamingStatus(status);

  // Compute line numbers for gutter (memoized to avoid re-splitting during streaming)
  // Must be above early returns to satisfy React's rules of hooks
  const lines = useMemo(() => selectedFile?.contents.split("\n") ?? [], [selectedFile?.contents]);
  const lineCount = lines.length;

  if (files.length === 0 && !isGenerating) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container text-on-surface-variant">
        <p className="text-sm">Start building to see code here.</p>
      </div>
    );
  }

  if (files.length === 0 && isGenerating) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container text-on-surface-variant">
        <div className="flex flex-col items-center gap-3 text-center">
          <MaterialIcon icon="progress_activity" size="md" className="animate-spin text-primary" />
          <p className="text-sm">Building&#8230;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-container-low">
      {/* File tab bar */}
      <header className="flex h-10 items-center justify-between bg-surface-container-high px-2">
        <div className="flex h-full items-end gap-0.5">
          {files.map((file) => {
            const filename = file.path.split("/").pop() ?? file.path;
            const isActive =
              selectedFile?.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedPath(file.path)}
                className={cn(
                  "flex h-[34px] items-center gap-2 rounded-t-lg px-4 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-white text-on-surface cursor-default"
                    : "text-on-surface-variant hover:bg-white/30 cursor-pointer"
                )}
                title={file.path}
              >
                {filename}
                {isActive && (
                  <span className="rounded p-0.5 transition-colors hover:bg-black/10">
                    <MaterialIcon icon="close" className="text-sm" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pr-2">
          <button
            className="rounded-md p-1.5 text-on-surface-variant transition-all hover:bg-white/50 active:scale-95"
            title="Copy Content"
            aria-label="Copy file contents"
            onClick={async () => {
              if (selectedFile) {
                await copyToClipboard(selectedFile.contents, "Copied to clipboard");
              }
            }}
          >
            <MaterialIcon icon="content_copy" size="sm" />
          </button>
          <button
            className="rounded-md p-1.5 text-on-surface-variant transition-all hover:bg-white/50 active:scale-95"
            title="Download"
            aria-label="Download file"
            onClick={() => {
              if (!selectedFile) return;
              const blob = new Blob([selectedFile.contents], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = selectedFile.path.split("/").pop() ?? "file.tsx";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <MaterialIcon icon="download" size="sm" />
          </button>
        </div>
      </header>

      {/* Code editor area */}
      <div className="flex flex-1 overflow-hidden bg-surface-container font-mono text-sm leading-relaxed">
        {selectedFile ? (
          <>
            {/* Line number gutter */}
            <div className="w-12 select-none bg-surface-container pt-4 pr-3 text-right text-on-surface-variant">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code canvas */}
            <ScrollArea className="flex-1">
              <pre className="whitespace-pre overflow-auto px-4 pt-4 text-on-surface">
                {selectedFile.contents}
              </pre>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-on-surface-variant">
            <p className="text-sm">Select a file to view its contents.</p>
          </div>
        )}
      </div>

    </div>
  );
}
