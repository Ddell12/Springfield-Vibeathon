"use client";

import { useState } from "react";

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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Start building to see code will appear here.</p>
      </div>
    );
  }

  if (files.length === 0 && isGenerating) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="animate-pulse text-center">
          <p className="text-sm">Generating your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header showing generating state */}
      {isGenerating && (
        <div className="flex items-center border-b px-3 py-2">
          <span className="animate-pulse text-xs text-muted-foreground">
            Writing...
          </span>
        </div>
      )}

      {/* File tabs */}
      <div className="flex gap-0 overflow-x-auto border-b">
        {files.map((file) => {
          const filename = file.path.split("/").pop() ?? file.path;
          return (
            <button
              key={file.path}
              onClick={() => setSelectedPath(file.path)}
              className={cn(
                "shrink-0 border-r px-3 py-1.5 text-xs",
                "hover:bg-muted",
                selectedPath === file.path
                  ? "bg-muted font-medium"
                  : "text-muted-foreground"
              )}
              title={file.path}
            >
              {filename}
            </button>
          );
        })}
      </div>

      {/* File contents */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <ScrollArea className="h-full">
            <div className="border-b p-2 text-xs text-muted-foreground">
              {selectedFile.path}
            </div>
            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed">
              {selectedFile.contents}
            </pre>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a file to view its contents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
