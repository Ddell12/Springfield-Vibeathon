"use client";

import { Copy, Download, X } from "lucide-react";
import { useState } from "react";

import { copyToClipboard } from "@/core/clipboard";
import { cn } from "@/core/utils";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import type { StreamingFile, StreamingStatus } from "../hooks/use-streaming";

interface CodePanelProps {
  files: StreamingFile[];
  status: StreamingStatus;
}

export function CodePanel({ files, status }: CodePanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Resolve selected file: fall back to first file when selectedPath not yet set
  const selectedFile =
    files.find((f) => f.path === selectedPath) ?? files[0] ?? null;

  const isGenerating = status === "generating";

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
        <div className="animate-pulse text-center">
          <p className="text-sm">Generating your files...</p>
        </div>
      </div>
    );
  }

  // Compute line numbers for gutter
  const lines = selectedFile?.contents.split("\n") ?? [];
  const lineCount = lines.length;

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
                    <X className="h-3.5 w-3.5" />
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
            onClick={async () => {
              if (selectedFile) {
                await copyToClipboard(selectedFile.contents, "Copied to clipboard");
              }
            }}
          >
            <Copy className="h-[18px] w-[18px]" />
          </button>
          <button
            className="rounded-md p-1.5 text-on-surface-variant transition-all hover:bg-white/50 active:scale-95"
            title="Download"
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
            <Download className="h-[18px] w-[18px]" />
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
