"use client";

import { useState } from "react";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useSessionFiles } from "../hooks/use-session";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/core/utils";

export function CodePanel({ sessionId }: { sessionId: Id<"sessions"> | null }) {
  const files = useSessionFiles(sessionId);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectedFile = files?.find((f: Doc<"files">) => f.path === selectedPath);

  if (!sessionId || !files || files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Files will appear here as your app is built.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File explorer sidebar */}
      <div className="w-48 shrink-0 border-r">
        <div className="p-2 text-xs font-medium uppercase text-muted-foreground">
          Files
        </div>
        <ScrollArea className="h-[calc(100%-2rem)]">
          {files.map((file: Doc<"files">) => (
            <button
              key={file._id}
              onClick={() => setSelectedPath(file.path)}
              className={cn(
                "block w-full truncate px-3 py-1.5 text-left text-xs",
                "hover:bg-muted",
                selectedPath === file.path && "bg-muted font-medium"
              )}
              title={file.path}
            >
              {file.path.split("/").pop()}
            </button>
          ))}
        </ScrollArea>
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
